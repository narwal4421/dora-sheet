import { HyperFormula } from 'hyperformula';
let hfInstance = null;
const sheetName = 'Sheet1';
let sheetId = undefined;
self.onmessage = function (e) {
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
            case 'SET_DATA':
                if (!hfInstance || sheetId === undefined)
                    throw new Error('Not initialized');
                // payload is { r, c, value }
                hfInstance.setCellContents({ sheet: sheetId, col: payload.c, row: payload.r }, [[payload.value]]);
                // After setting, we calculate and return all changed values (or we can just return the specific one for now)
                // Since we want sparse updates, let's just re-evaluate all formulas (naive but works for now)
                // HyperFormula automatically re-evaluates. We can get the newly calculated value.
                const calculatedValue = hfInstance.getCellValue({ sheet: sheetId, col: payload.c, row: payload.r });
                self.postMessage({
                    type: 'SET_DATA_SUCCESS',
                    msgId,
                    payload: { r: payload.r, c: payload.c, v: calculatedValue }
                });
                break;
            case 'GET_VALUE':
                if (!hfInstance || sheetId === undefined)
                    throw new Error('Not initialized');
                const v = hfInstance.getCellValue({ sheet: sheetId, col: payload.c, row: payload.r });
                self.postMessage({
                    type: 'GET_VALUE_SUCCESS',
                    msgId,
                    payload: { r: payload.r, c: payload.c, v }
                });
                break;
            default:
                console.warn('Unknown message type', type);
        }
    }
    catch (error) {
        self.postMessage({ type: 'ERROR', msgId, error: error.message });
    }
};
