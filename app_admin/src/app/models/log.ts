export interface AuditLog {
    _id?: string;
    logID: number;
    user: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
    endpoint: string;
    status: string;
    description: string;
    details?: Record<string, any>;
    timeStamp: string | Date;
}