"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const zod_1 = require("zod");
const ai_service_1 = require("./ai.service");
const redis_1 = require("../../config/redis");
const dayjs_1 = __importDefault(require("dayjs"));
const xlsx = __importStar(require("xlsx"));
const chatSchema = zod_1.z.object({
    sheetId: zod_1.z.string(),
    prompt: zod_1.z.string().min(1),
    activeCell: zod_1.z.string().optional()
});
class AIController {
    static async chat(req, res) {
        const userId = req.user?.userId || 'local-dev-user';
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
        let { sheetId, prompt } = chatSchema.parse(req.body);
        let fileData = undefined;
        let mimeType = undefined;
        if (req.file) {
            const isExcel = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                req.file.mimetype === 'application/vnd.ms-excel' ||
                req.file.originalname.endsWith('.xlsx') ||
                req.file.originalname.endsWith('.xls') ||
                req.file.originalname.endsWith('.csv');
            if (isExcel) {
                // Parse Excel/CSV into text before sending to AI
                try {
                    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
                    const firstSheetName = workbook.SheetNames[0];
                    const csvData = xlsx.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
                    prompt += `\n\n[Attached Spreadsheet Data]:\n${csvData}`;
                }
                catch (error) {
                    console.error("Failed to parse Excel file:", error);
                    throw new Error("Failed to parse the uploaded spreadsheet.");
                }
            }
            else {
                fileData = req.file.buffer.toString('base64');
                mimeType = req.file.mimetype;
            }
        }
        const result = await ai_service_1.AIService.chat(userId, sheetId, prompt, fileData, mimeType);
        res.json({
            success: true,
            data: result
        });
    }
}
exports.AIController = AIController;
