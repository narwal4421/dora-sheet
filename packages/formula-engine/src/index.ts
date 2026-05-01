export class EngineWrapper {
  private worker: Worker;
  private msgId = 0;
  private callbacks = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent) {
    const { msgId, type, payload, error } = e.data;
    const cb = this.callbacks.get(msgId);
    if (!cb) return;

    if (type === 'ERROR') {
      cb.reject(new Error(error));
    } else {
      cb.resolve(payload);
    }
    this.callbacks.delete(msgId);
  }

  private post<T>(type: string, payload?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.worker.postMessage({ msgId: id, type, payload });
    });
  }

  async init() {
    return this.post<void>('INIT');
  }

  async setData(r: number, c: number, value: string) {
    return this.post<{r: number, c: number, v: any}>('SET_DATA', { r, c, value });
  }

  async getValue(r: number, c: number) {
    return this.post<{r: number, c: number, v: any}>('GET_VALUE', { r, c });
  }
}
