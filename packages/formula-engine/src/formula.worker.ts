import { HyperFormula } from 'hyperformula';

let hfInstance: HyperFormula | null = null;
const sheetName = 'Sheet1';
let sheetId: number | undefined = undefined;

self.onmessage = function(e) {
  const { type, payload, msgId } = e.data;

  try {
    switch (type) {
      case 'INIT':
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3'
        });
        sheetId = hfInstance.getSheetId(sheetName);
        if (sheetId === undefined || sheetId === null) {
          hfInstance.addSheet(sheetName);
          sheetId = hfInstance.getSheetId(sheetName);
        }
        self.postMessage({ type: 'INIT_SUCCESS', msgId });
        break;

      case 'SET_DATA': {
        if (!hfInstance || sheetId === undefined) throw new Error('Not initialized');
        // payload is { r, c, value }
        const rawChanges = hfInstance.setCellContents({ sheet: sheetId, col: payload.c, row: payload.r }, [[payload.value]]) || [];
        const changedList: Array<{ r: number; c: number; v: any }> = [];
        
        for (const ch of rawChanges) {
          if (ch && (ch as any).address) {
            changedList.push({
              r: (ch as any).address.row,
              c: (ch as any).address.col,
              v: (ch as any).newValue
            });
          }
        }

        const calculatedValue = hfInstance.getCellValue({ sheet: sheetId, col: payload.c, row: payload.r });
        
        self.postMessage({ 
          type: 'SET_DATA_SUCCESS', 
          msgId, 
          payload: { 
            r: payload.r, 
            c: payload.c, 
            v: calculatedValue,
            changes: changedList 
          }
        });
        break;
      }

      case 'SET_SHEET_DATA': {
        if (!hfInstance || sheetId === undefined) throw new Error('Not initialized');
        // payload is array of { r: number, c: number, value: any }
        if (Array.isArray(payload)) {
          for (const item of payload) {
            try {
              if (item.value !== undefined && item.value !== null) {
                hfInstance.setCellContents({ sheet: sheetId, col: item.c, row: item.r }, [[item.value]]);
              }
            } catch {
              // ignore individual parsing errors in bulk init
            }
          }
        }
        self.postMessage({ type: 'SET_SHEET_DATA_SUCCESS', msgId });
        break;
      }

      case 'GET_VALUE': {
        if (!hfInstance || sheetId === undefined) throw new Error('Not initialized');
        const v = hfInstance.getCellValue({ sheet: sheetId, col: payload.c, row: payload.r });
        self.postMessage({ 
          type: 'GET_VALUE_SUCCESS', 
          msgId, 
          payload: { r: payload.r, c: payload.c, v } 
        });
        break;
      }

      default:
        console.warn('Unknown message type', type);
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', msgId, error: error.message });
  }
};
