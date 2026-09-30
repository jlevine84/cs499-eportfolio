import { Injectable, Inject, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuditLog } from '../models/log';
import { BROWSER_STORAGE } from '../storage';


export interface PaginatedLogsResponse {
    logs: AuditLog[];
    currentPage: number;
    totalPages: number;
    totalRecords: number;
}

@Injectable({
    providedIn: 'root'
})

export class LogData {

    private readonly baseUrl = 'http://localhost:3000/api';

    // Signal holding active log entries across components
    public logs: WritableSignal<AuditLog[]> = signal<AuditLog[]>([]);

    constructor(
        private http: HttpClient,
        @Inject(BROWSER_STORAGE) private storage: Storage
    ) {}

    // Resets log state upon logout
    public resetLogs(): void {
        this.logs.set([]);
    }

    // Helper to extract JWT header from Browser Storage
    private getAuthHeaders(): { headers: HttpHeaders } {
        const token = this.storage.getItem('travlr-token') || '';
        return {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${token}`
            })
        };
    }

    /**
     * Get paginated audit logs with search, action filtering, and reactive state sync
     */
    public getPaginatedLogs(
        page: number = 1,
        limit: number = 10,
        search: string = '',
        actionFilter: string = ''
    ): Observable<PaginatedLogsResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (search) {
            params = params.set('search', search);
        }
        if (actionFilter) {
            params = params.set('action', actionFilter);
        }

        return this.http.get<PaginatedLogsResponse>(
            `${this.baseUrl}/logs`, 
            { ...this.getAuthHeaders(), params }
        ).pipe(
            tap((res: PaginatedLogsResponse) => this.logs.set(res.logs))
        );
    }

    /**
     * Delete an individual log entry (Authenticated)
     */
    public deleteLog(logID: number): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/logs/${logID}`, 
            this.getAuthHeaders()
        ).pipe(
            tap(() => {
                this.logs.update(current => current.filter(l => l.logID !== logID));
            })
        );
    }

    /**
     * Clear all system audit logs (Authenticated Admin operation)
     */
    public clearAllLogs(): Observable<any> {
        return this.http.delete<any>(
            `${this.baseUrl}/logs`, 
            this.getAuthHeaders()
        ).pipe(
            tap(() => this.resetLogs())
        );
    }
}