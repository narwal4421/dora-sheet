import { EngineWrapper, type SetDataResult } from '@smartsheet-ai/formula-engine';
import { useSheetStore, type CellData, type SheetData } from '../store/useSheetStore';
import { socketService } from './socket.service';

export class FormulaService {
  private engine: EngineWrapper | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const worker = new Worker(
          new URL('@smartsheet-ai/formula-engine/dist/formula.worker.js', import.meta.url),
          { type: 'module' }
        );
        const wrapper = new EngineWrapper(worker);
        await wrapper.init();
        this.engine = wrapper;
        
        // Sync initial sheet data if present
        const currentData = useSheetStore.getState().data;
        if (currentData && Object.keys(currentData).length > 0) {
          await this.syncSheet(currentData);
        }
      } catch (err) {
        console.error('[FormulaService] Initialization error:', err);
      }
    })();

    return this.initPromise;
  }

  getEngine(): EngineWrapper | null {
    return this.engine;
  }

  async syncSheet(sheetData: SheetData): Promise<void> {
    if (!this.engine) return;
    const items: Array<{ r: number; c: number; value: any }> = [];
    
    for (const [key, cell] of Object.entries(sheetData)) {
      const match = key.match(/r_(\d+)_c_(\d+)/);
      if (!match) continue;
      const r = parseInt(match[1], 10);
      const c = parseInt(match[2], 10);
      const val = cell.f ?? cell.v;
      if (val !== undefined && val !== null) {
        items.push({ r, c, value: val });
      }
    }

    if (items.length > 0) {
      await this.engine.setSheetData(items);
    }
  }

  async commitCellChange(
    r: number,
    c: number,
    val: string
  ): Promise<{ v?: any; f?: string }> {
    const cellKey = `r_${r}_c_${c}`;
    const activeSheetId = useSheetStore.getState().activeSheetId;
    const isF = val.startsWith('=');
    const isNum = !isF && val.trim() !== '' && !isNaN(Number(val));
    const parsedVal = isNum ? Number(val) : val;

    // 1. Initial optimistic store update
    const initialUpdate: Partial<CellData> = isF
      ? { f: val, v: undefined }
      : { v: parsedVal, f: undefined };

    useSheetStore.getState().setCellData(cellKey, initialUpdate);
    socketService.emitCellUpdate(activeSheetId, cellKey, initialUpdate);

    // 2. Compute via formula engine (for both formulas AND values that could be inputs to formulas)
    if (this.engine) {
      try {
        const engineVal = isF ? val : (isNum ? parsedVal : (val === '' ? null : val));
        const res: SetDataResult = await this.engine.setData(r, c, engineVal);

        // Apply result for this cell
        const computedVal = isF ? res.v : parsedVal;
        const finalCellUpdate: Partial<CellData> = isF
          ? { f: val, v: computedVal }
          : { v: parsedVal, f: undefined };

        useSheetStore.getState().setCellData(cellKey, finalCellUpdate);
        socketService.emitCellUpdate(activeSheetId, cellKey, finalCellUpdate);

        // 3. Propagate all dependent cell changes (e.g. SUM/AVG recalculations)
        if (res.changes && res.changes.length > 0) {
          const bulkUpdates: Record<string, Partial<CellData>> = {};
          for (const ch of res.changes) {
            const depKey = `r_${ch.r}_c_${ch.c}`;
            if (depKey !== cellKey) {
              bulkUpdates[depKey] = { v: ch.v };
              socketService.emitCellUpdate(activeSheetId, depKey, { v: ch.v });
            }
          }
          if (Object.keys(bulkUpdates).length > 0) {
            useSheetStore.getState().bulkSetCellData(bulkUpdates);
          }
        }

        return { v: computedVal, f: isF ? val : undefined };
      } catch (err) {
        console.error('[FormulaService] Computation error:', err);
      }
    }

    return { v: parsedVal, f: isF ? val : undefined };
  }
}

export const formulaService = new FormulaService();
