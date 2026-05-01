export type CellKey = `r_${number}_c_${number}`;
export interface CellFormat {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontColor?: string;
    bgColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    numberFormat?: 'default' | 'currency' | 'percentage' | 'date';
    border?: {
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
    };
}
export interface CellData {
    v: string | number | boolean | null;
    f?: string;
    fmt?: CellFormat;
    error?: string;
}
export type SheetData = Record<CellKey, CellData>;
export interface SheetMeta {
    id: string;
    name: string;
    order: number;
    rowCount: number;
    colCount: number;
}
