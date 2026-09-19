export interface CellChange {
    r: number;
    c: number;
    v: any;
}
export interface SetDataResult {
    r: number;
    c: number;
    v: any;
    changes: CellChange[];
}
export declare class EngineWrapper {
    private worker;
    private msgId;
    private callbacks;
    constructor(worker: Worker);
    private handleMessage;
    private post;
    init(): Promise<void>;
    setData(r: number, c: number, value: string | number | boolean | null | undefined): Promise<SetDataResult>;
    setSheetData(items: Array<{
        r: number;
        c: number;
        value: any;
    }>): Promise<void>;
    getValue(r: number, c: number): Promise<{
        r: number;
        c: number;
        v: any;
    }>;
}
