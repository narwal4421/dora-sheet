"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    OPENAI_API_KEY: zod_1.z.string(),
    PORT: zod_1.z.string().default('3001'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: zod_1.z.string(),
    PUPPETEER_EXECUTABLE_PATH: zod_1.z.string().optional(),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('Invalid environment variables', _env.error.format());
    process.exit(1);
}
exports.env = _env.data;
