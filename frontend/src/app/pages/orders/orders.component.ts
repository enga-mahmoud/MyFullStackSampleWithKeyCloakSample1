import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { ApiService, Order, Product, CreateOrderRequest } from '../../services/api.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="flex justify-between align-center mb-3">
        <h1>Orders</h1>
        <button class="btn btn-primary" (click)="openPlaceOrder()" [disabled]="!isAdmin && !currentUserId">
          + Place Order
        </button>
      </div>

      <div *ngIf="!currentUserId && !isAdmin" class="alert alert-info mb-2">
        Your account is not linked to a user profile yet. Ask an admin to create your user record before placing orders.
      </div>

      <div class="card">
        <div *ngIf="loading" class="text-muted">Loading...</div>
        <div *ngIf="error" class="err-banner">{{ error }}</div>

        <table *ngIf="!loading && !error">
          <thead>
            <tr>
              <th>Order ID</th>
              <th *ngIf="isAdmin">User</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders">
              <td><strong>#{{ order.id }}</strong></td>
              <td *ngIf="isAdmin">{{ userMap[order.userId] || ('User #' + order.userId) }}</td>
              <td>{{ productMap[order.productId] || ('Product #' + order.productId) }}</td>
              <td>{{ order.quantity }}</td>
              <td>{{ order.totalPrice | currency }}</td>
              <td>
                <span class="badge" [ngClass]="order.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-failed'">
                  {{ order.status }}
                </span>
              </td>
              <td class="text-muted">{{ order.createdAt | date:'short' }}</td>
            </tr>
            <tr *ngIf="orders.length === 0">
              <td [attr.colspan]="isAdmin ? 7 : 6" class="text-muted" style="text-align:center;padding:2rem;">
                No orders found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Place Order Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>Place Order</h3>

        <div *ngIf="orderError" class="err-banner" style="margin-bottom:1rem;">{{ orderError }}</div>

        <div class="form-group" *ngIf="isAdmin">
          <label>User *</label>
          <select [(ngModel)]="form.userId">
            <option [ngValue]="0" disabled>— Select a user —</option>
            <option *ngFor="let entry of userEntries" [ngValue]="entry[0]">{{ entry[1] }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Product *</label>
          <select [(ngModel)]="form.productId">
            <option [ngValue]="0" disabled>— Select a product —</option>
            <option *ngFor="let p of availableProducts" [ngValue]="p.id">
              {{ p.name }} &mdash; {{ p.price | currency }} ({{ p.stock }} in stock)
            </option>
          </select>
          <p *ngIf="availableProducts.length === 0" class="text-muted" style="margin-top:0.4rem;font-size:0.85rem;">
            No products currently in stock.
          </p>
        </div>

        <div class="product-info" *ngIf="selectedProduct">
          <div><span class="info-label">Price:</span> {{ selectedProduct.price | currency }}</div>
          <div><span class="info-label">Available:</span> {{ selectedProduct.stock }} units</div>
        </div>

        <div class="form-group">
          <label>Quantity *</label>
          <input
            [(ngModel)]="form.quantity"
            type="number"
            min="1"
            [max]="selectedProduct?.stock || 9999"
            placeholder="1"
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
          <button
            class="btn btn-primary"
            (click)="placeOrder()"
            [disabled]="placing || !form.productId || form.quantity < 1 || (isAdmin && !form.userId)"
          >
            {{ placing ? 'Placing…' : 'Place Order' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .err-banner {
      background: #fde8e8;
      color: #c0392b;
      border-left: 4px solid #c0392b;
      padding: 0.75rem 1rem;
      border-radius: 6px;
    }
    .badge-confirmed { background: #e6f9ef; color: #27ae60; }
    .badge-failed    { background: #fde8e8; color: #c0392b; }
    select {
      width: 100%;
      padding: 0.6rem 0.8rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.95rem;
      background: white;
    }
    select:focus { outline: none; border-color: #4361ee; }
    .product-info {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 0.6rem 0.9rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
      display: flex;
      gap: 1.5rem;
    }
    .info-label { font-weight: 600; color: #555; }
  `]
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  products: Product[] = [];
  productMap: Record<number, string> = {};
  userMap: Record<number, string> = {};

  loading = true;
  error = '';
  showModal = false;
  orderError = '';
  placing = false;
  isAdmin = false;
  currentUserId?: number;

  form = { productId: 0, quantity: 1, userId: 0 };

  get selectedProduct(): Product | undefined {
    return this.products.find(p => p.id === this.form.productId);
  }

  get availableProducts(): Product[] {
    return this.products.filter(p => p.stock > 0);
  }

  get userEntries(): [number, string][] {
    return Object.entries(this.userMap).map(([id, name]) => [+id, name]);
  }

  constructor(private api: ApiService, private keycloak: KeycloakService) {}

  ngOnInit(): void {
    const token = this.keycloak.getKeycloakInstance().tokenParsed as Record<string, unknown>;
    this.isAdmin = ((token?.['roles'] as string[]) ?? []).includes('ROLE_ADMIN');
    const username = (token?.['preferred_username'] as string) ?? '';

    this.api.getProducts().subscribe({
      next: (prods) => {
        this.products = prods;
        this.productMap = Object.fromEntries(prods.map(p => [p.id!, p.name]));

        this.api.getUsers().subscribe({
          next: (users) => {
            const me = users.find(u => u.username === username);
            this.currentUserId = me?.id;
            if (this.isAdmin) {
              this.userMap = Object.fromEntries(users.map(u => [u.id!, u.username]));
            }
            this.loadOrders();
          },
          error: () => this.loadOrders()
        });
      },
      error: (e) => { this.error = e.message; this.loading = false; }
    });
  }

  loadOrders(): void {
    this.loading = true;
    const obs$ = this.isAdmin
      ? this.api.getOrders()
      : this.currentUserId != null
        ? this.api.getOrdersByUser(this.currentUserId)
        : of([] as Order[]);

    obs$.subscribe({
      next: (o) => { this.orders = o; this.loading = false; },
      error: (e) => { this.error = e.message; this.loading = false; }
    });
  }

  openPlaceOrder(): void {
    this.form = { productId: 0, quantity: 1, userId: this.currentUserId ?? 0 };
    this.orderError = '';
    this.api.getProducts().subscribe({
      next: (prods) => {
        this.products = prods;
        this.productMap = Object.fromEntries(prods.map(p => [p.id!, p.name]));
      }
    });
    if (this.isAdmin) {
      this.api.getUsers().subscribe({
        next: (users) => {
          this.userMap = Object.fromEntries(users.map(u => [u.id!, u.username]));
        }
      });
    }
    this.showModal = true;
  }

  placeOrder(): void {
    const userId = this.isAdmin ? this.form.userId : this.currentUserId;
    if (!this.form.productId || !userId || this.form.quantity < 1) {
      this.orderError = !userId ? 'Please select a user.' : 'Please fill in all required fields.';
      return;
    }
    this.placing = true;
    this.orderError = '';

    const request: CreateOrderRequest = {
      userId: userId,
      productId: this.form.productId,
      quantity: this.form.quantity
    };

    this.api.createOrder(request).subscribe({
      next: () => { this.closeModal(); this.loadOrders(); },
      error: (e) => {
        this.placing = false;
        this.orderError = e.error?.error || e.message || 'Failed to place order';
      }
    });
  }

  closeModal(): void { this.showModal = false; this.placing = false; }
}
