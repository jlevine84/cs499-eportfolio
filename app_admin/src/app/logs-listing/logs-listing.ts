import { Component, OnInit, Signal, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogData } from '../services/log-data';
import { Authentication } from '../services/authentication';
import { AuditLog } from '../models/log';
import { LogCard } from '../log-card/log-card';

@Component({
	selector: 'app-logs-listing',
	standalone: true,
	imports: [CommonModule, FormsModule, LogCard],
	templateUrl: './logs-listing.html',
	styleUrl: './logs-listing.css',
})
export class LogsListing implements OnInit {
	// Inject services directly in field declarations
	private logDataService = inject(LogData);
	private authenticationService = inject(Authentication);

	// Now safe to access logDataService directly
	protected readonly logs: Signal<AuditLog[]> = this.logDataService.logs;
	protected readonly isLoggedIn = computed(() => this.authenticationService.isLoggedInSignal());

	// Filter & Pagination Reactive Signals
	public searchTerm = signal<string>('');
	public selectedAction = signal<string>('');
	public currentPage = signal<number>(1);
	public totalPages = signal<number>(1);
	public totalRecords = signal<number>(0);
	public limit = signal<number>(10);

	ngOnInit(): void {
		this.loadLogs();
	}

	public loadLogs(): void {
		this.logDataService.getPaginatedLogs(
		this.currentPage(),
		this.limit(),
		this.searchTerm(),
		this.selectedAction()
		).subscribe({
		next: (res) => {
			this.currentPage.set(res.currentPage);
			this.totalPages.set(res.totalPages);
			this.totalRecords.set(res.totalRecords);
		},
		error: (err) => console.error('Error fetching logs:', err)
		});
	}

	public onSearchChange(term: string): void {
		this.searchTerm.set(term);
		this.currentPage.set(1);
		this.loadLogs();
	}

	public onActionFilterChange(action: string): void {
		this.selectedAction.set(action);
		this.currentPage.set(1);
		this.loadLogs();
	}

	public changePage(newPage: number): void {
		if (newPage >= 1 && newPage <= this.totalPages()) {
		this.currentPage.set(newPage);
		this.loadLogs();
		}
	}
}