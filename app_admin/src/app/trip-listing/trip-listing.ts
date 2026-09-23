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

    // Fetch paginated trips from API
    public loadTrips(): void {
        this.tripData.getPaginatedTrips(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery()
        ).subscribe({
            next: (res: PaginatedTripsResponse) => {
                this.trips.set(res.trips);
                this.currentPage.set(res.currentPage);
                this.totalPages.set(res.totalPages);
                this.totalRecords.set(res.totalRecords);

                if (res.trips.length > 0) {
                    // Maintain selected item or select first item in new page
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

    ngOnInit(): void {
        if (this.isLoggedIn()) {
            this.loadTrips();
        }
    }
}