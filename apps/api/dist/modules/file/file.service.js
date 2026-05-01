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
exports.FileService = void 0;
const xlsx = __importStar(require("xlsx"));
const prisma_1 = require("../../config/prisma");
const puppeteer_1 = __importDefault(require("puppeteer"));
class FileService {
    static async importExcel(buffer, workbookId, userId) {
        // Verify access
        const workbook = await prisma_1.prisma.workbook.findUnique({
            where: { id: workbookId },
            include: { workspace: { include: { members: { where: { userId } } } } }
        });
        if (!workbook || workbook.workspace.members.length === 0 || workbook.workspace.members[0].role === 'VIEWER') {
            throw { statusCode: 403, message: 'Forbidden' };
        }
        const wb = xlsx.read(buffer, { type: 'buffer' });
        // Import all sheets
        for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const json = xlsx.utils.sheet_to_json(ws, { header: 1 });
            const data = {};
            let maxR = 0;
            let maxC = 0;
            for (let r = 0; r < json.length; r++) {
                const row = json[r];
                if (!row)
                    continue;
                for (let c = 0; c < row.length; c++) {
                    if (row[c] !== undefined && row[c] !== null && row[c] !== '') {
                        data[`r_${r}_c_${c}`] = { v: row[c] };
                        if (r > maxR)
                            maxR = r;
                        if (c > maxC)
                            maxC = c;
                    }
                }
            }
            await prisma_1.prisma.sheet.create({
                data: {
                    name: sheetName,
                    workbookId,
                    rowCount: Math.max(100, maxR + 10),
                    colCount: Math.max(26, maxC + 5),
                    data: JSON.stringify(data)
                }
            });
        }
    }
    static async importCsv(buffer, workbookId, userId) {
        const wb = xlsx.read(buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(ws, { header: 1 });
        const data = {};
        for (let r = 0; r < json.length; r++) {
            const row = json[r];
            if (!row)
                continue;
            for (let c = 0; c < row.length; c++) {
                if (row[c] !== undefined) {
                    data[`r_${r}_c_${c}`] = { v: row[c] };
                }
            }
        }
        await prisma_1.prisma.sheet.create({
            data: {
                name: 'Imported CSV',
                workbookId,
                data: JSON.stringify(data)
            }
        });
    }
    static async exportXlsx(workbookId, userId) {
        const workbook = await prisma_1.prisma.workbook.findUnique({
            where: { id: workbookId },
            include: { sheets: true, workspace: { include: { members: { where: { userId } } } } }
        });
        if (!workbook || workbook.workspace.members.length === 0) {
            throw { statusCode: 403, message: 'Forbidden' };
        }
        const wb = xlsx.utils.book_new();
        for (const sheet of workbook.sheets) {
            const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) || {};
            const aoa = [];
            for (let r = 0; r < sheet.rowCount; r++) {
                aoa[r] = [];
                for (let c = 0; c < sheet.colCount; c++) {
                    const cell = dataObj[`r_${r}_c_${c}`];
                    aoa[r][c] = cell?.v ?? null;
                }
            }
            const ws = xlsx.utils.aoa_to_sheet(aoa);
            xlsx.utils.book_append_sheet(wb, ws, sheet.name);
        }
        return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    static async exportCsv(sheetId, userId) {
        const sheet = await prisma_1.prisma.sheet.findUnique({
            where: { id: sheetId },
            include: { workbook: { include: { workspace: { include: { members: { where: { userId } } } } } } }
        });
        if (!sheet || sheet.workbook.workspace.members.length === 0)
            throw { statusCode: 403, message: 'Forbidden' };
        const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) || {};
        const aoa = [];
        for (let r = 0; r < sheet.rowCount; r++) {
            aoa[r] = [];
            for (let c = 0; c < sheet.colCount; c++) {
                aoa[r][c] = dataObj[`r_${r}_c_${c}`]?.v ?? '';
            }
        }
        const ws = xlsx.utils.aoa_to_sheet(aoa);
        return xlsx.utils.sheet_to_csv(ws);
    }
    static async exportPdf(workbookId, userId) {
        const workbook = await prisma_1.prisma.workbook.findUnique({
            where: { id: workbookId },
            include: { sheets: true, workspace: { include: { members: { where: { userId } } } } }
        });
        if (!workbook || workbook.workspace.members.length === 0) {
            throw { statusCode: 403, message: 'Forbidden' };
        }
        let html = `<html><head><style>
      table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 10px; page-break-after: always; }
      th, td { border: 1px solid #ddd; padding: 4px; }
      h2 { font-family: sans-serif; }
    </style></head><body>`;
        for (const sheet of workbook.sheets) {
            html += `<h2>${sheet.name}</h2><table>`;
            const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) || {};
            for (let r = 0; r < sheet.rowCount; r++) {
                // Only render rows that have some data to save PDF space
                let hasData = false;
                let rowHtml = '<tr>';
                for (let c = 0; c < sheet.colCount; c++) {
                    const val = dataObj[`r_${r}_c_${c}`]?.v ?? '';
                    if (val)
                        hasData = true;
                    rowHtml += `<td>${val}</td>`;
                }
                rowHtml += '</tr>';
                if (hasData)
                    html += rowHtml;
            }
            html += `</table>`;
        }
        html += `</body></html>`;
        const browser = await puppeteer_1.default.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();
        return Buffer.from(pdfBuffer.buffer);
    }
}
exports.FileService = FileService;
