"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("./auth.service");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(2),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
class AuthController {
    static async register(req, res) {
        const data = registerSchema.parse(req.body);
        const result = await auth_service_1.AuthService.register(data.email, data.password, data.name);
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
    static async login(req, res) {
        const data = loginSchema.parse(req.body);
        const result = await auth_service_1.AuthService.login(data.email, data.password);
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
    static async refresh(req, res) {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/refreshToken=([^;]+)/);
        const oldToken = match ? match[1] : null;
        if (!oldToken) {
            throw { statusCode: 401, code: 'NO_TOKEN', message: 'No refresh token provided' };
        }
        const result = await auth_service_1.AuthService.refresh(oldToken);
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
    static async logout(req, res) {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/refreshToken=([^;]+)/);
        const token = match ? match[1] : null;
        if (token) {
            await auth_service_1.AuthService.logout(token);
        }
        res.clearCookie('refreshToken');
        res.json({ success: true, data: null });
    }
}
exports.AuthController = AuthController;
