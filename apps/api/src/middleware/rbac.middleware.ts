import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: ('ADMIN' | 'EDITOR' | 'VIEWER')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw { name: 'UnauthorizedError', message: 'User not authenticated' };
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw { name: 'ForbiddenError', message: 'Insufficient permissions' };
    }

    next();
  };
}
