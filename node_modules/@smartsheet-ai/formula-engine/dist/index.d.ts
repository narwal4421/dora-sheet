export declare class EngineWrapper {
    private worker;
    private msgId;
    private callbacks;
    constructor(worker: Worker);
    private handleMessage;
    private post;
    init(): Promise<void>;
    setData(r: number, c: number, value: string): Promise<{
        r: number;
        c: number;
        v: any;
    }>;
    getValue(r: number, c: number): Promise<{
        r: number;
        c: number;
        v: any;
    }>;
}
