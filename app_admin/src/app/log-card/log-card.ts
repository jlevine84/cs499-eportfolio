import { Component, Input, signal } from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { AuditLog } from '../models/log';

@Component({
  selector: 'app-log-card',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonPipe],
  templateUrl: './log-card.html',
  styleUrl: './log-card.css'
})
export class LogCard {
  @Input({ required: true }) log!: AuditLog;

  // Track collapse state per log entry
  public isExpanded = signal<boolean>(false);

  public toggleDetails(): void {
    this.isExpanded.update(val => !val);
  }

  getActionBadgeClass(action: string): string {
    switch (action?.toUpperCase()) {
      case 'CREATE':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'UPDATE':
      case 'UPDATE_TRIP':
        return 'bg-primary-subtle text-primary border border-primary-subtle';
      case 'DELETE':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'LOGIN':
      case 'USER_LOGIN':
        return 'bg-info-subtle text-info border border-info-subtle';
      case 'LOGIN_FAILED':
        return 'bg-warning-subtle text-warning border border-warning-subtle';
      default:
        return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
    }
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'bg-secondary-subtle text-secondary';
    if (status.startsWith('2') || status.toLowerCase().includes('ok') || status.toLowerCase().includes('logged')) {
      return 'bg-success-subtle text-success';
    }
    if (status.startsWith('4') || status.startsWith('5') || status.toLowerCase().includes('failed') || status.toLowerCase().includes('unauthorized')) {
      return 'bg-danger-subtle text-danger';
    }
    return 'bg-secondary-subtle text-secondary';
  }
}