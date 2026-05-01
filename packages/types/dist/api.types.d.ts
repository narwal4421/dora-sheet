export interface APIResponse<T = unknown> {
    success: boolean;
    data: T;
    meta?: Record<string, unknown>;
}
export interface APIError {
    success: false;
    code: string;
    message: string;
    details?: unknown;
}
export interface JWTPayload {
    userId: string;
    email: string;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    workspaceId?: string;
    iat: number;
    exp: number;
}
