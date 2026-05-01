// In-memory mock for Redis
class MockRedis {
  private store: Map<string, string> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async get(key: string) { return this.store.get(key) || null; }
  async set(key: string, value: string, ...args: any[]) { this.store.set(key, value); }
  async del(...keys: string[]) { keys.forEach(k => this.store.delete(k)); }
  async incr(key: string) { 
    const val = parseInt(this.store.get(key) || '0') + 1;
    this.store.set(key, val.toString());
    return val;
  }
  async expire(key: string, seconds: number) {} // no-op for mock
  async smembers(key: string) { return Array.from(this.sets.get(key) || []); }
  async sadd(key: string, ...members: string[]) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    members.forEach(m => this.sets.get(key)!.add(m));
  }
  async srem(key: string, ...members: string[]) {
    if (this.sets.has(key)) members.forEach(m => this.sets.get(key)!.delete(m));
  }

  on(event: string, callback: any) {}
}

export const redis = new MockRedis() as any;
