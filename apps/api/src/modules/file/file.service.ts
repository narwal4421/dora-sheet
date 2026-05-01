import * as xlsx from 'xlsx';
import { prisma } from '../../config/prisma';
import puppeteer from 'puppeteer';

export class FileService {
  static async importExcel(buffer: Buffer, workbookId: string, userId: string) {
    // Verify access
    const workbook = await prisma.workbook.findUnique({
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
      const json = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });
      
      const data: any = {};
      let maxR = 0;
      let maxC = 0;

      for (let r = 0; r < json.length; r++) {
        const row = json[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c] !== undefined && row[c] !== null && row[c] !== '') {
            data[`r_${r}_c_${c}`] = { v: row[c] };
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
          }
        }
      }

      await prisma.sheet.create({
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

  static async importCsv(buffer: Buffer, workbookId: string, userId: string) {
    const wb = xlsx.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });
    
    const data: any = {};
    for (let r = 0; r < json.length; r++) {
      const row = json[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== undefined) {
          data[`r_${r}_c_${c}`] = { v: row[c] };
        }
      }
    }

    await prisma.sheet.create({
      data: {
        name: 'Imported CSV',
        workbookId,
        data: JSON.stringify(data)
      }
    });
  }

  static async exportXlsx(workbookId: string, userId: string): Promise<Buffer> {
    const workbook = await prisma.workbook.findUnique({
      where: { id: workbookId },
      include: { sheets: true, workspace: { include: { members: { where: { userId } } } } }
    });

    if (!workbook || workbook.workspace.members.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const wb = xlsx.utils.book_new();

    for (const sheet of workbook.sheets) {
      const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) as Record<string, any> || {};
      const aoa: any[][] = [];
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

  static async exportCsv(sheetId: string, userId: string): Promise<string> {
    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      include: { workbook: { include: { workspace: { include: { members: { where: { userId } } } } } } }
    });

    if (!sheet || sheet.workbook.workspace.members.length === 0) throw { statusCode: 403, message: 'Forbidden' };

    const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) as Record<string, any> || {};
    const aoa: any[][] = [];
    for (let r = 0; r < sheet.rowCount; r++) {
      aoa[r] = [];
      for (let c = 0; c < sheet.colCount; c++) {
        aoa[r][c] = dataObj[`r_${r}_c_${c}`]?.v ?? '';
      }
    }
    const ws = xlsx.utils.aoa_to_sheet(aoa);
    return xlsx.utils.sheet_to_csv(ws);
  }

  static async exportPdf(workbookId: string, userId: string): Promise<Buffer> {
    const workbook = await prisma.workbook.findUnique({
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
      const dataObj = (typeof sheet.data === 'string' ? JSON.parse(sheet.data) : sheet.data) as Record<string, any> || {};
      for (let r = 0; r < sheet.rowCount; r++) {
        // Only render rows that have some data to save PDF space
        let hasData = false;
        let rowHtml = '<tr>';
        for (let c = 0; c < sheet.colCount; c++) {
          const val = dataObj[`r_${r}_c_${c}`]?.v ?? '';
          if (val) hasData = true;
          rowHtml += `<td>${val}</td>`;
        }
        rowHtml += '</tr>';
        if (hasData) html += rowHtml;
      }
      html += `</table>`;
    }

    html += `</body></html>`;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    return Buffer.from(pdfBuffer.buffer);
  }
}
