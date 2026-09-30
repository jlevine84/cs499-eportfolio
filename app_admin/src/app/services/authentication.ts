import { WritableSignal, signal, Injectable, Inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BROWSER_STORAGE } from '../storage';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { TripData } from './trip-data';

@Injectable({
	providedIn: 'root' 
})
export class Authentication {
    // Reactive Signal tracking login state across components
    public isLoggedInSignal: WritableSignal<boolean> = signal<boolean>(false);

    // Storage and service access setup
    constructor(
        @Inject(BROWSER_STORAGE) private storage: Storage,
        private tripData: TripData
    ) {
        // Init signal state on service instantiation
        this.isLoggedInSignal.set(this.checkTokenValidity());
    }

    // Check if current token exists and is not expired
    private checkTokenValidity(): boolean {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.exp > (Date.now() / 1000);
        } catch (e) {
            return false;
        }
    }

    // Variable to handle Auth responses
    authRes: AuthResponse = new AuthResponse();

    // Method for retrieval of token from Storage
    public getToken(): string {
        let out = this.storage.getItem("travlr-token");
        if (!out) { return ""; }
        return out;
    }

    // Method to save token from Storage 
    public saveToken(token: string): void {
        this.storage.setItem("travlr-token", token);
        this.isLoggedInSignal.set(true);
    }

    // Method to logout of application and remove token from storage
    public logout(): void {
        this.storage.removeItem("travlr-token");
        this.tripData.resetTrips();
        this.isLoggedInSignal.set(false);
    }

    /* Accessors and Mutators */
    public isLoggedIn(): boolean {
        return this.isLoggedInSignal();
    }

    // Retrieve current user
    public getCurrentUser(): User {
        const token: string = this.getToken();
        if (!token) return {} as User;
        const { email, name } = JSON.parse(atob(token.split(".")[1]));
        return { email, name } as User;
    }

    // Login method - Returns Observable<AuthResponse>
    public login(user: User, password: string): Observable<AuthResponse> {
        return this.tripData.login(user, password).pipe(
            tap((value: AuthResponse) => {
                if (value && value.token) {
                    this.authRes = value;
                    this.saveToken(this.authRes.token);
                }
            })
        );
    }

    // Register method - Returns Observable<AuthResponse>
    public register(userPayload: any, password?: string): Observable<AuthResponse> {
        // Supports both register(user, password) and register(newUserPayload)
        const userObj = password ? userPayload : { name: userPayload.name, email: userPayload.email, role: userPayload.role };
        const passVal = password || userPayload.password;

        return this.tripData.register(userObj, passVal).pipe(
            tap((value: AuthResponse) => {
                if (value && value.token) {
                    this.authRes = value;
                    this.saveToken(this.authRes.token);
                }
            })
        );
    }
}