"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../../config/env");
const prisma_1 = require("../../config/prisma");
const openai = new openai_1.default({ apiKey: env_1.env.OPENAI_API_KEY || 'dummy' });
class AIService {
    static async handleChat(userId, sheetId, prompt) {
        const sheet = await prisma_1.prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workbook: { include: { workspace: { include: { members: true } } } } }
        });
        if (!sheet)
            throw { statusCode: 404, message: 'Sheet not found' };
        // Verify access
        const isMember = sheet.workbook.workspace.members.some(m => m.userId === userId);
        if (!isMember)
            throw { statusCode: 403, message: 'Forbidden' };
        // Build context
        const dataObj = sheet.data || {};
        // Extract up to 10 rows
        const sampleData = [];
        const columns = [];
        // Naive column extraction from r_0
        for (let c = 0; c < sheet.colCount; c++) {
            const cell = dataObj[`r_0_c_${c}`];
            if (cell && cell.v) {
                columns.push({ index: c, header: cell.v, type: "text" });
            }
        }
        // Sample data extraction
        for (let r = 0; r < Math.min(10, sheet.rowCount); r++) {
            const rowData = {};
            for (let c = 0; c < sheet.colCount; c++) {
                const cell = dataObj[`r_${r}_c_${c}`];
                if (cell && cell.v) {
                    rowData[`c_${c}`] = cell.v;
                }
            }
            if (Object.keys(rowData).length > 0)
                sampleData.push(rowData);
        }
        const systemPrompt = JSON.stringify({
            sheet_context: {
                name: sheet.name,
                total_rows: sheet.rowCount,
                columns,
                sample_data: sampleData
            }
        });
        const tools = [
            { type: "function", function: { name: "query_data", description: "Query specific data from the sheet", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
            { type: "function", function: { name: "apply_formula", description: "Generate a spreadsheet formula", parameters: { type: "object", properties: { formula: { type: "string" }, targetCell: { type: "string" } }, required: ["formula", "targetCell"] } } },
            { type: "function", function: { name: "create_chart", description: "Suggest a chart type for selected data", parameters: { type: "object", properties: { chartType: { type: "string", enum: ["bar", "line", "pie", "scatter"] }, reason: { type: "string" } }, required: ["chartType", "reason"] } } },
            { type: "function", function: { name: "filter_rows", description: "Filter rows based on criteria", parameters: { type: "object", properties: { criteria: { type: "string" } }, required: ["criteria"] } } },
            { type: "function", function: { name: "find_duplicates", description: "Find duplicate rows or values", parameters: { type: "object", properties: { column: { type: "string" } }, required: ["column"] } } },
            { type: "function", function: { name: "generate_report", description: "Generate a text summary report", parameters: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] } } },
            { type: "function", function: { name: "explain_formula", description: "Explain how a formula works", parameters: { type: "object", properties: { explanation: { type: "string" } }, required: ["explanation"] } } },
        ];
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: `You are SmartSheet AI. You have access to this sheet context:\n${systemPrompt}` },
                { role: "user", content: prompt }
            ],
            tools,
            tool_choice: "auto"
        });
        const msg = response.choices[0].message;
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            const tc = msg.tool_calls[0];
            return {
                tool_used: tc.function.name,
                result: JSON.parse(tc.function.arguments),
                suggestion: "I have suggested an action based on your request. Please accept or reject."
            };
        }
        return {
            tool_used: "none",
            result: msg.content,
            suggestion: "No specific action taken."
        };
    }
}
exports.AIService = AIService;
