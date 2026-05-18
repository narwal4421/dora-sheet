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
    REDIS_URL: zod_1.z.string().optional(),
    JWT_SECRET: zod_1.z.string().min(8).default('a-very-secret-key-that-is-at-least-32-chars-long'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(8).default('another-very-secret-refresh-key-at-least-32-chars'),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    PORT: zod_1.z.string().default('3001'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    PUPPETEER_EXECUTABLE_PATH: zod_1.z.string().optional(),
    LIVEKIT_API_KEY: zod_1.z.string().optional(),
    LIVEKIT_API_SECRET: zod_1.z.string().optional(),
});
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('FATAL: Invalid environment variables configuration:');
    const errors = _env.error.format();
    Object.entries(errors).forEach(([key, value]) => {
        if (key !== '_errors') {
            console.error(`  - ${key}: ${value._errors.join(', ')}`);
        }
    });
    console.error('\nPlease check your Render/Environment variables settings.');
    process.exit(1);
}
exports.env = _env.data;
