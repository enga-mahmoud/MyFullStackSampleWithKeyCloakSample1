import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { ApiService, Product } from '../../services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="flex justify-between align-center mb-3">
        <h1>Products</h1>
        <button class="btn btn-primary" *ngIf="isAdmin" (click)="openCreate()">+ New Product</button>
      </div>

      <div class="card">
        <div *ngIf="loading" class="text-muted">Loading...</div>
        <div *ngIf="error" style="background:#fde8e8;color:#c0392b;border-left:4px solid #c0392b;padding:1rem;border-radius:6px;">
          {{ error }}
        </div>

        <table *ngIf="!loading">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Created</th>
              <th *ngIf="isAdmin">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of products">
              <td>{{ p.id }}</td>
              <td><strong>{{ p.name }}</strong></td>
              <td class="text-muted">{{ p.description || '—' }}</td>
              <td>{{ p.price | currency }}</td>
              <td>
                <span [style.color]="p.stock === 0 ? '#e74c3c' : '#2ecc71'">{{ p.stock }}</span>
              </td>
              <td class="text-muted">{{ p.createdAt | date:'short' }}</td>
              <td *ngIf="isAdmin">
                <div class="actions">
                  <button class="btn btn-outline" (click)="openEdit(p)">Edit</button>
                  <button class="btn btn-danger" (click)="deleteProduct(p.id!)">Delete</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="products.length === 0">
              <td colspan="7" class="text-muted" style="text-align:center;padding:2rem;">No products found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>{{ editMode ? 'Edit Product' : 'Create Product' }}</h3>
        <div class="form-group">
          <label>Name *</label>
          <input [(ngModel)]="form.name" placeholder="Product name" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea [(ngModel)]="form.description" rows="3" placeholder="Optional description"></textarea>
        </div>
        <div class="form-group">
          <label>Price *</label>
          <input [(ngModel)]="form.price" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Stock</label>
          <input [(ngModel)]="form.stock" type="number" min="0" placeholder="0" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
          <button class="btn btn-primary" (click)="save()">{{ editMode ? 'Update' : 'Create' }}</button>
        </div>
      </div>
    </div>
  `
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  error = '';
  showModal = false;
  editMode = false;
  editId?: number;
  isAdmin = false;
  form: Product = { name: '', price: 0, stock: 0 };

  constructor(private api: ApiService, private keycloak: KeycloakService) {}

  ngOnInit(): void {
    this.isAdmin = this.keycloak.isUserInRole('ROLE_ADMIN');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getProducts().subscribe({
      next: (p) => { this.products = p; this.loading = false; },
      error: (e) => { this.error = e.message; this.loading = false; }
    });
  }

  openCreate(): void {
    this.form = { name: '', price: 0, stock: 0 };
    this.editMode = false;
    this.showModal = true;
  }

  openEdit(p: Product): void {
    this.form = { ...p };
    this.editId = p.id;
    this.editMode = true;
    this.showModal = true;
  }

  save(): void {
    if (this.editMode && this.editId != null) {
      this.api.updateProduct(this.editId, this.form).subscribe({ next: () => { this.closeModal(); this.load(); } });
    } else {
      this.api.createProduct(this.form).subscribe({ next: () => { this.closeModal(); this.load(); } });
    }
  }

  deleteProduct(id: number): void {
    if (confirm('Delete this product?')) {
      this.api.deleteProduct(id).subscribe({ next: () => this.load() });
    }
  }

  closeModal(): void { this.showModal = false; }
}
