import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <h1>Dashboard</h1>

      <div class="card alert-info" style="margin-bottom:1.5rem;">
        <strong>Welcome back, {{ username }}!</strong>
        <p class="text-muted" style="margin-top:0.25rem;">You are logged in as <strong>{{ roles.join(', ') }}</strong></p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
        <a routerLink="/users" class="card" style="text-decoration:none;color:inherit;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">👥</div>
          <h3>Users</h3>
          <p class="text-muted">Manage user accounts</p>
        </a>
        <a routerLink="/products" class="card" style="text-decoration:none;color:inherit;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">📦</div>
          <h3>Products</h3>
          <p class="text-muted">Browse and manage products</p>
        </a>
        <a routerLink="/orders" class="card" style="text-decoration:none;color:inherit;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">🛒</div>
          <h3>Orders</h3>
          <p class="text-muted">Place and track orders</p>
        </a>
        <a routerLink="/admin" *ngIf="isAdmin" class="card" style="text-decoration:none;color:inherit;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">⚙️</div>
          <h3>Admin Panel</h3>
          <p class="text-muted">System administration</p>
        </a>
      </div>

      <div class="card" style="margin-top:1.5rem;">
        <h3>Token Info</h3>
        <table style="margin-top:0.75rem;">
          <tbody>
            <tr>
              <th>Username</th>
              <td>{{ username }}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{{ email }}</td>
            </tr>
            <tr>
              <th>Roles</th>
              <td>
                <span class="badge badge-admin" *ngFor="let role of roles" style="margin-right:0.25rem;">{{ role }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  username = '';
  email = '';
  roles: string[] = [];
  isAdmin = false;

  constructor(private keycloak: KeycloakService) {}

  ngOnInit(): void {
    this.username = this.keycloak.getUsername();
    this.isAdmin = this.keycloak.isUserInRole('ROLE_ADMIN');
    this.keycloak.loadUserProfile().then((profile) => {
      this.email = profile.email ?? '';
    });
    const token = this.keycloak.getKeycloakInstance();
    const parsed = token.tokenParsed as Record<string, unknown>;
    this.roles = (parsed?.['roles'] as string[]) ?? [];
  }
}
