"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const zod_1 = require("zod");
const ai_service_1 = require("./ai.service");
const redis_1 = require("../../config/redis");
const dayjs_1 = __importDefault(require("dayjs"));
const chatSchema = zod_1.z.object({
    sheetId: zod_1.z.string().uuid(),
    prompt: zod_1.z.string().min(1)
});
class AIController {
    static async chat(req, res) {
        const userId = req.user.userId;
        // Rate Limiting
        const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
        const limitKey = `ai:ratelimit:${userId}:${today}`;
        const count = await redis_1.redis.incr(limitKey);
        if (count === 1) {
            // Set expiry to end of day
            const eod = (0, dayjs_1.default)().endOf('day').unix();
            const now = (0, dayjs_1.default)().unix();
            await redis_1.redis.expire(limitKey, eod - now);
        }
        if (count > 50) {
            res.status(429).json({
                success: false,
                error: {
                    message: 'Rate limit exceeded',
                    resetAt: (0, dayjs_1.default)().add(1, 'day').startOf('day').toISOString()
                }
            });
            return;
        }
        const { sheetId, prompt } = chatSchema.parse(req.body);
        const result = await ai_service_1.AIService.handleChat(userId, sheetId, prompt);
        res.json({
            success: true,
            data: result
        });
    }
}
exports.AIController = AIController;
