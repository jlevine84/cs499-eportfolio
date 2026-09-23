import { Injectable, Inject, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Trip } from "../models/trip";
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { BROWSER_STORAGE } from '../storage';

export interface PaginatedTripsResponse {
    trips: Trip[];
    currentPage: number;
    totalPages: number;
    totalRecords: number;
}

@Injectable({
    providedIn: "root"
})
export class TripData {

    private readonly baseUrl = "http://localhost:3000/api";

    // Signal holding the active trip list state across components
    public trips: WritableSignal<Trip[]> = signal<Trip[]>([]);

    constructor(
        private http: HttpClient,
        @Inject(BROWSER_STORAGE) private storage: Storage
    ) {}

    // Resets trip state upon logout
    public resetTrips(): void {
        this.trips.set([]);
    }

    // Helper to get Authorization Header with JWT token
    private getAuthHeaders(): { headers: HttpHeaders } {
        const token = this.storage.getItem("travlr-token") || "";
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    /* Trip endpoints */

    // Get paginated trips & update the reactive signal state
    public getPaginatedTrips(page: number = 1, limit: number = 6, search: string = ''): Observable<PaginatedTripsResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (search) {
            params = params.set('search', search);
        }

        return this.http.get<PaginatedTripsResponse>(`${this.baseUrl}/trips`, { params }).pipe(
            tap((res: PaginatedTripsResponse) => this.trips.set(res.trips))
        );
    }

    // Legacy/Unpaginated method fallback
    public getTrips(): Observable<Trip[]> {
        return this.http.get<Trip[]>(`${this.baseUrl}/trips`).pipe(
            tap((data: Trip[]) => this.trips.set(data))
        );
    }

    // Add a new trip (Authenticated Endpoint)
    public addTrip(formData: Trip): Observable<Trip> {
        return this.http.post<Trip>(`${this.baseUrl}/trips`, formData, this.getAuthHeaders()).pipe(
            tap((newTrip: Trip) => this.trips.update(current => [...current, newTrip]))
        );
    }

    // Get a single trip by code
    public getTrip(tripCode: string): Observable<Trip[]> {
        return this.http.get<Trip[]>(`${this.baseUrl}/trips/${tripCode}`);
    }

    // Update a trip (Authenticated Endpoint)
    public updateTrip(formData: Trip): Observable<Trip> {
        return this.http.put<Trip>(`${this.baseUrl}/trips/${formData.code}`, formData, this.getAuthHeaders()).pipe(
            tap((updatedTrip: Trip) => {
                this.trips.update(current => 
                    current.map(t => t.code === updatedTrip.code ? updatedTrip : t)
                );
            })
        );
    }

    /* Authentication Helpers */

    private handleAuthAPICall(endpoint: string, user: User, password: string): Observable<AuthResponse> {
        const formData = {
            name: user.name,
            email: user.email,
            password: password
        };
        return this.http.post<AuthResponse>(`${this.baseUrl}/${endpoint}`, formData);
    }

    public login(user: User, password: string): Observable<AuthResponse> {
        return this.handleAuthAPICall("login", user, password);
    }

    public register(user: User, password: string): Observable<AuthResponse> {
        return this.handleAuthAPICall("register", user, password);
    }
}