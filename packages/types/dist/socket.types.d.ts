import { CellKey, CellData } from './cell.types';
export interface CellUpdateEvent {
    sheetId: string;
    cellKey: CellKey;
    cell: CellData;
    userId: string;
}
export interface CursorMoveEvent {
    userId: string;
    userName: string;
    sheetId: string;
    row: number;
    col: number;
    color: string;
}
export interface CellLockEvent {
    userId: string;
    cellKey: CellKey;
    action: 'lock' | 'unlock';
}
