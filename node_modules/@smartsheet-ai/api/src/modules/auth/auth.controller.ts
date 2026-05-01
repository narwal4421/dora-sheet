import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  static async register(req: Request, res: Response) {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data.email, data.password, data.name);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken }
    });
  }

  static async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken }
    });
  }

  static async refresh(req: Request, res: Response) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/refreshToken=([^;]+)/);
    const oldToken = match ? match[1] : null;

    if (!oldToken) {
      throw { statusCode: 401, code: 'NO_TOKEN', message: 'No refresh token provided' };
    }

    const result = await AuthService.refresh(oldToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: result.accessToken }
    });
  }

  static async logout(req: Request, res: Response) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/refreshToken=([^;]+)/);
    const token = match ? match[1] : null;

    if (token) {
      await AuthService.logout(token);
    }
    
    res.clearCookie('refreshToken');
    res.json({ success: true, data: null });
  }
}
