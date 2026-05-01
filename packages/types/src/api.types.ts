export interface APIResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface APIError {
  success: false;
  code: string;       // e.g. "VALIDATION_ERROR", "UNAUTHORIZED"
  message: string;
  details?: unknown;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  workspaceId?: string; // added optional as workspace won't exist at first or might be multiple, but user requested it in payload
  iat: number;
  exp: number;
}
