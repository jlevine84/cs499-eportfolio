import { Component, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TripCard } from '../trip-card/trip-card';
import { Trip } from '../models/trip';
import { TripData, PaginatedTripsResponse } from '../services/trip-data';
import { Authentication } from '../services/authentication';

@Component({
    selector: 'app-trip-listing',
    standalone: true,
    imports: [TripCard, ReactiveFormsModule],
    templateUrl: './trip-listing.html',
    styleUrl: './trip-listing.css'
})
export class TripListing implements OnInit {
    // Reactive Signals state
    trips: WritableSignal<Trip[]> = signal([]);
    selectedTrip: WritableSignal<Trip | null> = signal(null);

    // Pagination & Search Signals
    currentPage: WritableSignal<number> = signal(1);
    totalPages: WritableSignal<number> = signal(1);
    totalRecords: WritableSignal<number> = signal(0);
    pageSize: WritableSignal<number> = signal(6);
    searchQuery: WritableSignal<string> = signal('');
    
    // Form controls & flags
    editForm!: FormGroup;
    submitted: boolean = false;
    message: string = '';

    // Auth check
    protected readonly isLoggedIn = computed(() => this.authenticationService.isLoggedInSignal());

    constructor(
        private fb: FormBuilder,
        private tripData: TripData,
        private router: Router,
        private authenticationService: Authentication
    ) {
        this.initForm();
    }

    private initForm(): void {
        this.editForm = this.fb.group({
            _id: [''],
            code: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}[0-9]{3,6}$/)]],
            name: ['', [Validators.required, Validators.minLength(3)]],
            length: ['', Validators.required],
            start: ['', Validators.required],
            resort: ['', Validators.required],
            perPerson: ['', [Validators.required, Validators.min(1)]],
            image: ['', Validators.required],
            description: ['', [Validators.required, Validators.minLength(10)]]
        });
    }

    get f() { return this.editForm.controls; }

    /**
     * Helper to format ISO date strings (e.g. 2026-01-19T08:00:00.000Z) 
     * into YYYY-MM-DD format for HTML date input compatibility.
     */
    private formatDateForInput(dateString: string | Date | undefined): string {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }

    public addTrip(): void {
        this.router.navigate(['add-trip']);
    }

    public onTripSelect(trip: Trip): void {
        this.selectedTrip.set(trip);
        this.submitted = false;

        // Patch form values, converting start date into YYYY-MM-DD
        this.editForm.patchValue({
            ...trip,
            start: this.formatDateForInput(trip.start)
        });
    }

    public onSave(): void {
        this.submitted = true;

        if (this.editForm.invalid) {
            return;
        }

        const updatedTrip = {
            ...this.editForm.value,
            // Convert back to full ISO string format for MongoDB storage
            start: new Date(this.editForm.value.start).toISOString()
        };

        this.tripData.updateTrip(updatedTrip).subscribe({
            next: (value: any) => {
                console.log('Trip updated successfully:', value);
                this.loadTrips(); // Refresh current page view
            },
            error: (error: any) => {
                console.error('Error updating trip:', error);
            }
        });
    }

    public onReset(): void {
        const current = this.selectedTrip();
        if (current) {
            this.editForm.patchValue({
                ...current,
                start: this.formatDateForInput(current.start)
            });
            this.submitted = false;
        }
    }

	// Fetch paginated trips from API with server-side sorting
	public loadTrips(): void {
		this.tripData.getPaginatedTrips(
			this.currentPage(),
			this.pageSize(),
			this.searchQuery(),
			this.sortOption() // Pass active sort key
		).subscribe({
			next: (res: PaginatedTripsResponse) => {
				this.trips.set(res.trips);
				this.currentPage.set(res.currentPage);
				this.totalPages.set(res.totalPages);
				this.totalRecords.set(res.totalRecords);

				if (res.trips.length > 0) {
					if (!this.selectedTrip() || !res.trips.some(t => t.code === this.selectedTrip()?.code)) {
						this.onTripSelect(res.trips[0]);
					}
					this.message = `Displaying page ${res.currentPage} of ${res.totalPages}`;
				} else {
					this.selectedTrip.set(null);
					this.message = 'No trip packages found.';
				}
			},
			error: (error: any) => {
				console.error('Error loading trips: ', error);
			}
		});
	}

	// Dropdown change handler
	public onSort(event: Event): void {
		const selectedValue = (event.target as HTMLSelectElement).value;
		this.sortOption.set(selectedValue);
		this.currentPage.set(1); // Reset to page 1 on sort change
		this.loadTrips();        // Query backend for newly sorted dataset
	}

    // Page Change Navigation Handler
    public goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
            this.loadTrips();
        }
    }

    // Dynamic Search Handler
    public onSearch(event: Event): void {
        const query = (event.target as HTMLInputElement).value;
        this.searchQuery.set(query);
        this.currentPage.set(1); // Reset to first page on search
        this.loadTrips();
    }

	public onDelete(tripCode: string): void {
		if (!tripCode) return;

		const confirmed = confirm(`Are you sure you want to delete trip ${tripCode}? This action cannot be undone.`);
		if (!confirmed) return;

		this.tripData.deleteTrip(tripCode).subscribe({
			next: (response: any) => {
				console.log('Trip deleted successfully:', response);
				
				// Clear current selection
				this.selectedTrip.set(null);

				// If we deleted the last item on a page, step back one page
				if (this.trips().length === 1 && this.currentPage() > 1) {
					this.currentPage.set(this.currentPage() - 1);
				}

				// Reload inventory
				this.loadTrips();
			},
			error: (error: any) => {
				console.error('Error deleting trip:', error);
				alert(`Failed to delete trip: ${error.message || error}`);
			}
		});
	}

	// Sort option Signal state
	sortOption: WritableSignal<string> = signal('name-asc');

	// Sorts an array of trips in-place based on the active sort key
    private applySorting(tripsList: Trip[]): Trip[] {
        const option = this.sortOption();
        return [...tripsList].sort((a, b) => {
            // Safely parse numeric prices to avoid TS2362 type errors
            const priceA = Number(a.perPerson) || 0;
            const priceB = Number(b.perPerson) || 0;

            switch (option) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'price-asc':
                    return priceA - priceB;
                case 'price-desc':
                    return priceB - priceA;
                default:
                    return 0;
            }
        });
    }

    ngOnInit(): void {
        if (this.isLoggedIn()) {
            this.loadTrips();
        }
    }
}