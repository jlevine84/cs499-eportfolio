import { Component, Input, Output, EventEmitter, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../models/user';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-card.html',
  styleUrl: './user-card.css'
})
export class UserCard {
  @Input({ required: true }) user!: User;
  @Input() isSelected = false;

  @Output() select = new EventEmitter<User>();

  @HostBinding('class.selected-card') get selectedClass() {
    return this.isSelected;
  }

  @HostListener('click')
  public onSelect(): void {
    this.select.emit(this.user);
  }

  public getRoleBadgeClass(role?: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'bg-primary text-white';
      case 'editor':
        return 'bg-secondary text-white';
      default:
        return 'bg-info text-dark';
    }
  }
}