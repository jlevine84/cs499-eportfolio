import { Injectable, Inject, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../models/user';
import { BROWSER_STORAGE } from '../storage';

export interface PaginatedUsersResponse {
    users: User[];
    currentPage: number;
    totalPages: number;
    totalRecords: number;
}

@Injectable({
    providedIn: 'root'
})
export class UserData {

    private readonly baseUrl = 'http://localhost:3000/api';

    // Signal holding list of users for administration views
    public users: WritableSignal<User[]> = signal<User[]>([]);
    
    // Signal holding active user's profile details
    public currentUserProfile: WritableSignal<User | null> = signal<User | null>(null);

    constructor(
        private http: HttpClient,
        @Inject(BROWSER_STORAGE) private storage: Storage
    ) {}

    // Resets user state upon logout
    public resetUsers(): void {
        this.users.set([]);
        this.currentUserProfile.set(null);
    }

    // Helper to get Authorization Header with JWT token
    private getAuthHeaders(): { headers: HttpHeaders } {
        const token = this.storage.getItem('travlr-token') || '';
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    /**
     * Get active user's profile details (/api/users/me)
     */
    public getCurrentUserProfile(): Observable<User> {
        return this.http.get<User>(
            `${this.baseUrl}/users/me`, 
            this.getAuthHeaders()
        ).pipe(
            tap((profile: User) => this.currentUserProfile.set(profile))
        );
    }

    /**
     * Get paginated users list
     */
    public getPaginatedUsers(
        page: number = 1,
        limit: number = 10,
        search: string = ''
    ): Observable<PaginatedUsersResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (search) {
            params = params.set('search', search);
        }

        return this.http.get<PaginatedUsersResponse>(
            `${this.baseUrl}/users`, 
            { ...this.getAuthHeaders(), params }
        ).pipe(
            tap((res: PaginatedUsersResponse) => this.users.set(res.users))
        );
    }

    /**
     * Update user details (name, role, status) identified by email
     */
    public updateUser(email: string, userData: Partial<User>): Observable<User> {
        return this.http.put<User>(
            `${this.baseUrl}/users/${email}`, 
            userData, 
            this.getAuthHeaders()
        ).pipe(
            tap((updatedUser: User) => {
                this.users.update(current => 
                    current.map(u => u.email === updatedUser.email ? updatedUser : u)
                );
                if (this.currentUserProfile()?.email === updatedUser.email) {
                    this.currentUserProfile.set(updatedUser);
                }
            })
        );
    }

    /**
     * Delete user account identified by email
     */
    public deleteUser(email: string): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/users/${email}`, 
            this.getAuthHeaders()
        ).pipe(
            tap(() => {
                this.users.update(current => current.filter(u => u.email !== email));
            })
        );
    }
}