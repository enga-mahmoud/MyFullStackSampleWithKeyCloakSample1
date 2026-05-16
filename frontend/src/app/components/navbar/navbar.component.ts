import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <span>MyApp</span>
      </div>
      <div class="nav-links">
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/users" routerLinkActive="active">Users</a>
        <a routerLink="/products" routerLinkActive="active">Products</a>
        <a routerLink="/admin" routerLinkActive="active" *ngIf="isAdmin">Admin</a>
      </div>
      <div class="nav-user" *ngIf="isLoggedIn">
        <span class="username">{{ username }}</span>
        <span class="badge badge-admin" *ngIf="isAdmin">Admin</span>
        <span class="badge badge-user" *ngIf="!isAdmin">User</span>
        <button class="btn btn-outline" (click)="logout()">Logout</button>
      </div>
      <div class="nav-user" *ngIf="!isLoggedIn">
        <button class="btn btn-primary" (click)="login()">Login</button>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 0 1.5rem;
      height: 60px;
      background: #1a1a2e;
      color: white;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .nav-brand span {
      font-size: 1.2rem;
      font-weight: 700;
      color: #4cc9f0;
    }
    .nav-links {
      display: flex;
      gap: 0.25rem;
      flex: 1;
    }
    .nav-links a {
      color: #aaa;
      text-decoration: none;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .nav-links a:hover, .nav-links a.active {
      color: white;
      background: rgba(255,255,255,0.1);
    }
    .nav-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-left: auto;
    }
    .username {
      font-size: 0.9rem;
      color: #ccc;
    }
    .btn-outline {
      color: #4cc9f0;
      border-color: #4cc9f0;
      font-size: 0.85rem;
      padding: 0.35rem 0.8rem;
    }
  `]
})
export class NavbarComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  username = '';

  constructor(private keycloak: KeycloakService) {}

  ngOnInit(): void {
    this.isLoggedIn = this.keycloak.isLoggedIn();
    if (this.isLoggedIn) {
      this.username = this.keycloak.getUsername();
      this.isAdmin = this.keycloak.isUserInRole('ROLE_ADMIN');
    }
  }

  login(): void {
    this.keycloak.login();
  }

  logout(): void {
    this.keycloak.logout(window.location.origin);
  }
}
