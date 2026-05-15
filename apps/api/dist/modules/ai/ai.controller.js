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
    activeCell: zod_1.z.string().optional(),
    history: zod_1.z.string().optional(),
    sheetContext: zod_1.z.string().optional()
});
class AIController {
    static async chat(req, res) {
        try {
            const userId = req.user?.userId || 'local-dev-user';
            // Rate Limiting (Safe mock)
            const today = (0, dayjs_1.default)().format('YYYY-MM-DD');
            const limitKey = `ai:ratelimit:${userId}:${today}`;
            let count = 0;
            try {
                count = await redis_1.redis.incr(limitKey);
            }
            catch (e) {
                console.warn("Redis fail, skipping rate limit");
            }
            if (count > 100) {
                return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
            }
            // Safe Parsing
            let body;
            try {
                body = chatSchema.parse(req.body);
            }
            catch (e) {
                return res.status(400).json({ success: false, message: 'Invalid request: ' + e.message });
            }
            let { sheetId, prompt, history, sheetContext } = body;
            let fileData = undefined;
            let mimeType = undefined;
            // Safe History Parsing
            let parsedHistory = [];
            try {
                parsedHistory = history ? JSON.parse(history) : [];
                if (!Array.isArray(parsedHistory))
                    parsedHistory = [];
            }
            catch (e) {
                console.warn("History parse failed, using empty history");
                parsedHistory = [];
            }
            if (req.file) {
                const isExcel = req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    req.file.mimetype === 'application/vnd.ms-excel' ||
                    req.file.originalname.endsWith('.xlsx') ||
                    req.file.originalname.endsWith('.xls') ||
                    req.file.originalname.endsWith('.csv');
                if (isExcel) {
                    try {
                        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
                        let attachedDataContext = "\n\n── ATTACHED DOCUMENT CONTENT ──\n";
                        for (const sheetName of workbook.SheetNames) {
                            const worksheet = workbook.Sheets[sheetName];
                            const csvData = xlsx.utils.sheet_to_csv(worksheet);
                            // Limit each sheet's context to avoid blowing up the prompt, 
                            // but provide enough for the AI to understand the structure.
                            const lines = csvData.split('\n');
                            const previewLines = lines.slice(0, 100).join('\n');
                            attachedDataContext += `\n[Sheet: ${sheetName}]\n`;
                            attachedDataContext += `Total Rows: ${lines.length}\n`;
                            attachedDataContext += `Data Preview:\n${previewLines}\n`;
                            if (lines.length > 100) {
                                attachedDataContext += `(... ${lines.length - 100} more rows)\n`;
                            }
                        }
                        attachedDataContext += "───────────────────────────────\n";
                        prompt += attachedDataContext;
                    }
                    catch (error) {
                        console.error("Excel parse failed", error);
                        prompt += `\n\n[System Note: An Excel file was attached but could not be parsed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
                    }
                }
                else {
                    fileData = req.file.buffer.toString('base64');
                    mimeType = req.file.mimetype;
                }
            }
            const result = await ai_service_1.AIService.chat(userId, sheetId, prompt, fileData, mimeType, parsedHistory, sheetContext);
            return res.json({
                success: true,
                data: result
            });
        }
        catch (err) {
            console.error("[Controller Critical Error]", err);
            return res.status(500).json({
                success: false,
                message: `Controller Error: ${err.message}`
            });
        }
    }
}
exports.AIController = AIController;
