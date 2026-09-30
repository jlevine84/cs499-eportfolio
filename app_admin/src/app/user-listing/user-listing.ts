import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { UserData } from '../services/user-data';
import { Authentication } from '../services/authentication';
import { UserCard } from '../user-card/user-card';
import { User } from '../models/user';

@Component({
  selector: 'app-user-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, UserCard],
  templateUrl: './user-listing.html',
  styleUrl: './user-listing.css'
})
export class UserListing implements OnInit {
  private userDataService = inject(UserData);
  private authenticationService = inject(Authentication);

  protected readonly isLoggedIn = computed(() => this.authenticationService.isLoggedInSignal());
  protected readonly users = this.userDataService.users;

  // Search & Filter State
  public searchTerm = signal<string>('');
  public roleFilter = signal<string>('all');

  // UI Panel Controls
  public selectedUser = signal<User | null>(null);
  public isCreating = signal<boolean>(false);

  // Form Fields
  public formName = signal<string>('');
  public formEmail = signal<string>('');
  public formRole = signal<'admin' | 'editor'>('editor');
  public formStatus = signal<'active' | 'inactive'>('active');
  public formPassword = signal<string>('');

  // Status Feedback
  public formError = signal<string>('');
  public formSuccess = signal<string>('');

  // Computed Filtered User List
  public filteredUsers = computed(() => {
    let list = this.users();
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();

    if (role !== 'all') {
      list = list.filter(u => u.role?.toLowerCase() === role);
    }

    if (term) {
      list = list.filter(u => 
        u.email.toLowerCase().includes(term) || 
        (u.name && u.name.toLowerCase().includes(term))
      );
    }

    return list;
  });

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      this.loadUsers();
    }
  }

  public loadUsers(): void {
    this.userDataService.getPaginatedUsers(1, 100).subscribe({
      error: (err: HttpErrorResponse) => console.error('Error loading users:', err)
    });
  }

  // Open "Create User" Mode
  public startCreate(): void {
    this.selectedUser.set(null);
    this.isCreating.set(true);
    this.resetForm();
  }

  // Open "Edit User" Mode when clicking a card
  public selectUser(user: User): void {
    this.isCreating.set(false);
    this.selectedUser.set(user);
    this.formError.set('');
    this.formSuccess.set('');
    
    this.formName.set(user.name || '');
    this.formEmail.set(user.email);
    const r = user.role?.toLowerCase();
    this.formRole.set(r === 'admin' || r === 'administrator' ? 'admin' : 'editor');
    this.formStatus.set(user.status === 'inactive' ? 'inactive' : 'active');
    this.formPassword.set('');
  }

  // Close the right panel completely
  public closePanel(): void {
    this.selectedUser.set(null);
    this.isCreating.set(false);
    this.resetForm();
  }

  public resetForm(): void {
    this.formName.set('');
    this.formEmail.set('');
    this.formRole.set('editor');
    this.formStatus.set('active');
    this.formPassword.set('');
    this.formError.set('');
    this.formSuccess.set('');
  }

  public registerUser(): void {
    this.formError.set('');
    this.formSuccess.set('');

    if (!this.formEmail() || !this.formPassword() || !this.formName()) {
      this.formError.set('Please fill out all required fields.');
      return;
    }

    const newUserPayload = {
      name: this.formName(),
      email: this.formEmail(),
      role: this.formRole(),
      password: this.formPassword()
    };

    this.authenticationService.register(newUserPayload).subscribe({
      next: () => {
        this.formSuccess.set(`Account ${this.formEmail()} created successfully!`);
        this.closePanel();
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || err.error || 'Failed to create user account.');
      }
    });
  }

  public saveUserUpdate(): void {
    const current = this.selectedUser();
    if (!current) return;

    this.formError.set('');
    this.formSuccess.set('');

    const payload: Partial<User> = {
      name: this.formName(),
      role: this.formRole(),
      status: this.formStatus()
    };

    this.userDataService.updateUser(current.email, payload).subscribe({
      next: (updated) => {
        this.formSuccess.set(`Successfully updated ${updated.email}!`);
        this.selectedUser.set(updated);
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || err.error || 'Error updating user.');
      }
    });
  }

  public deleteUser(): void {
    const current = this.selectedUser();
    if (!current) return;

    if (confirm(`Are you sure you want to delete account ${current.email}?`)) {
      this.userDataService.deleteUser(current.email).subscribe({
        next: () => {
          this.closePanel();
          this.loadUsers();
        },
        error: (err: HttpErrorResponse) => console.error('Error deleting user:', err)
      });
    }
  }
}