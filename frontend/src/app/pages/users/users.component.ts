import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { ApiService, User } from '../../services/api.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="flex justify-between align-center mb-3">
        <h1>Users</h1>
        <button class="btn btn-primary" *ngIf="isAdmin" (click)="openCreate()">+ New User</button>
      </div>

      <div class="card">
        <div *ngIf="loading" class="text-muted">Loading...</div>
        <div *ngIf="error" class="alert" style="background:#fde8e8;color:#c0392b;border-left:4px solid #c0392b;padding:1rem;border-radius:6px;">
          {{ error }}
        </div>

        <table *ngIf="!loading">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Created</th>
              <th *ngIf="isAdmin">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.id }}</td>
              <td><strong>{{ user.username }}</strong></td>
              <td>{{ user.email }}</td>
              <td>{{ user.firstName || '—' }}</td>
              <td>{{ user.lastName || '—' }}</td>
              <td class="text-muted">{{ user.createdAt | date:'short' }}</td>
              <td *ngIf="isAdmin">
                <div class="actions">
                  <button class="btn btn-outline" (click)="openEdit(user)">Edit</button>
                  <button class="btn btn-danger" (click)="deleteUser(user.id!)">Delete</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="users.length === 0">
              <td colspan="7" class="text-muted" style="text-align:center;padding:2rem;">No users found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>{{ editMode ? 'Edit User' : 'Create User' }}</h3>
        <div class="form-group">
          <label>Username *</label>
          <input [(ngModel)]="form.username" placeholder="username" />
        </div>
        <div class="form-group">
          <label>Email *</label>
          <input [(ngModel)]="form.email" type="email" placeholder="email@example.com" />
        </div>
        <div class="form-group">
          <label>First Name</label>
          <input [(ngModel)]="form.firstName" placeholder="First name" />
        </div>
        <div class="form-group">
          <label>Last Name</label>
          <input [(ngModel)]="form.lastName" placeholder="Last name" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="closeModal()">Cancel</button>
          <button class="btn btn-primary" (click)="save()">{{ editMode ? 'Update' : 'Create' }}</button>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';
  showModal = false;
  editMode = false;
  editId?: number;
  isAdmin = false;
  form: User = { username: '', email: '' };

  constructor(private api: ApiService, private keycloak: KeycloakService) {}

  ngOnInit(): void {
    const token = this.keycloak.getKeycloakInstance().tokenParsed as Record<string, unknown>;
    const roles = (token?.['roles'] as string[]) ?? [];
    this.isAdmin = roles.includes('ROLE_ADMIN');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: (e) => { this.error = e.message; this.loading = false; }
    });
  }

  openCreate(): void {
    this.form = { username: '', email: '' };
    this.editMode = false;
    this.showModal = true;
  }

  openEdit(user: User): void {
    this.form = { ...user };
    this.editId = user.id;
    this.editMode = true;
    this.showModal = true;
  }

  save(): void {
    if (this.editMode && this.editId != null) {
      this.api.updateUser(this.editId, this.form).subscribe({ next: () => { this.closeModal(); this.load(); } });
    } else {
      this.api.createUser(this.form).subscribe({ next: () => { this.closeModal(); this.load(); } });
    }
  }

  deleteUser(id: number): void {
    if (confirm('Delete this user?')) {
      this.api.deleteUser(id).subscribe({ next: () => this.load() });
    }
  }

  closeModal(): void { this.showModal = false; }
}
