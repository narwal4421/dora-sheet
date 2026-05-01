"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
// In-memory mock for Redis
class MockRedis {
    store = new Map();
    sets = new Map();
    async get(key) { return this.store.get(key) || null; }
    async set(key, value, ...args) { this.store.set(key, value); }
    async del(...keys) { keys.forEach(k => this.store.delete(k)); }
    async incr(key) {
        const val = parseInt(this.store.get(key) || '0') + 1;
        this.store.set(key, val.toString());
        return val;
    }
    async expire(key, seconds) { } // no-op for mock
    async smembers(key) { return Array.from(this.sets.get(key) || []); }
    async sadd(key, ...members) {
        if (!this.sets.has(key))
            this.sets.set(key, new Set());
        members.forEach(m => this.sets.get(key).add(m));
    }
    async srem(key, ...members) {
        if (this.sets.has(key))
            members.forEach(m => this.sets.get(key).delete(m));
    }
    on(event, callback) { }
}
exports.redis = new MockRedis();
