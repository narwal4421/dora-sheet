export class EngineWrapper {
    worker;
    msgId = 0;
    callbacks = new Map();
    constructor(worker) {
        this.worker = worker;
        this.worker.onmessage = this.handleMessage.bind(this);
    }
    handleMessage(e) {
        const { msgId, type, payload, error } = e.data;
        const cb = this.callbacks.get(msgId);
        if (!cb)
            return;
        if (type === 'ERROR') {
            cb.reject(new Error(error));
        }
        else {
            cb.resolve(payload);
        }
        this.callbacks.delete(msgId);
    }
    post(type, payload) {
        return new Promise((resolve, reject) => {
            const id = ++this.msgId;
            this.callbacks.set(id, { resolve, reject });
            this.worker.postMessage({ msgId: id, type, payload });
        });
    }
    async init() {
        return this.post('INIT');
    }
    async setData(r, c, value) {
        return this.post('SET_DATA', { r, c, value });
    }
    async getValue(r, c) {
        return this.post('GET_VALUE', { r, c });
    }
}
