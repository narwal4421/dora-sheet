import * as XLSX from 'xlsx';
import { useSheetStore, type SheetData, type CellFormat } from '../store/useSheetStore';
import { toast } from '../store/useToastStore';

export interface ImportResult {
  sheets: Array<{ id: string; name: string; data: SheetData }>;
  workbookName: string;
  totalCells: number;
}

/**
 * Parses an Excel or CSV file into Dora Sheet multi-tab workbook structure
 */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellStyles: true,
    cellDates: true,
    raw: false,
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('No worksheets found in this file.');
  }

  const sheets: Array<{ id: string; name: string; data: SheetData }> = [];
  let totalCells = 0;

  for (let idx = 0; idx < wb.SheetNames.length; idx++) {
    const sheetName = wb.SheetNames[idx];
    const ws = wb.Sheets[sheetName];
    const sheetData: SheetData = {};

    if (ws && ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const coord = XLSX.utils.encode_cell({ r, c });
          const cell = ws[coord];
          
          if (!cell) continue;

          const cellKey = `r_${r}_c_${c}`;
          const isFormula = !!cell.f;
          const formulaStr = isFormula ? (cell.f.startsWith('=') ? cell.f : `=${cell.f}`) : undefined;
          
          let val: string | number | boolean | null = null;
          if (cell.v !== undefined && cell.v !== null) {
            val = cell.v;
          } else if (cell.w !== undefined) {
            val = cell.w;
          }

          // Extract basic cell formatting from number format strings
          const fmt: CellFormat = {};
          if (cell.z) {
            const z = String(cell.z);
            if (z.includes('$') || z.includes('€') || z.includes('£') || z.includes('₹')) {
              fmt.numFmt = 'currency';
            } else if (z.includes('%')) {
              fmt.numFmt = 'percent';
            } else if (z.includes('yy') || z.includes('dd') || z.includes('mm')) {
              fmt.numFmt = 'date';
            } else if (z.includes('0') || z.includes('#')) {
              fmt.numFmt = 'number';
            }
          }

          // Type detection fallback
          if (typeof val === 'number') {
            if (!fmt.numFmt) fmt.numFmt = 'number';
          }

          sheetData[cellKey] = {
            v: val,
            f: formulaStr,
            fmt: Object.keys(fmt).length > 0 ? fmt : undefined
          };
          totalCells++;
        }
      }
    }

    sheets.push({
      id: `sheet-${Date.now()}-${idx}`,
      name: sheetName,
      data: sheetData
    });
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return {
    sheets,
    workbookName: baseName || 'Imported Workbook',
    totalCells
  };
}

/**
 * High-level helper to import and load an Excel file directly into the active sheet store
 */
export async function handleImportExcelFile(file: File): Promise<boolean> {
  try {
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.csv', '.tsv'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      toast('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.', 'warning');
      return false;
    }

    toast(`Importing "${file.name}"...`, 'info');
    const result = await parseExcelFile(file);

    useSheetStore.getState().importWorkbook(result.sheets, result.workbookName);
    toast(`Opened "${result.workbookName}" with ${result.sheets.length} sheet${result.sheets.length > 1 ? 's' : ''} (${result.totalCells} cells)`, 'success');
    return true;
  } catch (err) {
    console.error('Failed to import Excel file:', err);
    toast(`Failed to open file: ${(err as Error).message || 'Invalid or corrupted file'}`, 'error');
    return false;
  }
}
