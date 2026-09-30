export interface User {
    email: string;
    name: string;
    role?: 'admin' | 'editor';
    status?: 'active' | 'inactive';
    createdAt?: string | Date;
    updatedAt?: string | Date;
}