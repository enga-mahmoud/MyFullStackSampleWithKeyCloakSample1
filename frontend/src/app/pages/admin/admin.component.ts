import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Admin Panel</h1>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;">
        <div class="card" style="text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#4361ee;">{{ totalUsers }}</div>
          <div class="text-muted">Total Users</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#2ecc71;">{{ totalProducts }}</div>
          <div class="text-muted">Total Products</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#e74c3c;">{{ outOfStock }}</div>
          <div class="text-muted">Out of Stock</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:2.5rem;font-weight:700;color:#f39c12;">{{ totalOrders }}</div>
          <div class="text-muted">Total Orders</div>
        </div>
      </div>

      <div class="card">
        <h3>Quick Links</h3>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:1rem;">
          <a href="http://localhost:8080/admin" target="_blank" class="btn btn-primary">Keycloak Admin</a>
          <a href="http://localhost:3000" target="_blank" class="btn btn-outline">Grafana</a>
          <a href="http://localhost:9090" target="_blank" class="btn btn-outline">Prometheus</a>
          <a href="http://localhost:8888/actuator" target="_blank" class="btn btn-outline">Config Server</a>
          <a href="http://localhost:8090/actuator/gateway/routes" target="_blank" class="btn btn-outline">Gateway Routes</a>
          <a href="http://localhost:8083/actuator/health" target="_blank" class="btn btn-outline">Order Service</a>
        </div>
      </div>

      <div class="card">
        <h3>Service Health</h3>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>API Gateway</span>
            <span class="badge badge-user">:8090</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>User Service</span>
            <span class="badge badge-user">:8081</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Product Service</span>
            <span class="badge badge-user">:8082</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Order Service</span>
            <span class="badge badge-user">:8083</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Config Server</span>
            <span class="badge badge-user">:8888</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Keycloak</span>
            <span class="badge badge-admin">:8080</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  totalUsers = 0;
  totalProducts = 0;
  outOfStock = 0;
  totalOrders = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    forkJoin({
      users: this.api.getUsers(),
      products: this.api.getProducts(),
      orders: this.api.getOrders().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ users, products, orders }) => {
        this.totalUsers = users.length;
        this.totalProducts = products.length;
        this.outOfStock = products.filter((p) => p.stock === 0).length;
        this.totalOrders = orders.length;
      },
    });
  }
}
