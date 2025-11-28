export class MapCache {
  private cache: Map<string, any> = new Map();
  private keySeparator = '--[[]]--';

  constructor() {
    this.cache = new Map();
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(key: string, value: any): string {
    return `${key}${this.keySeparator}${JSON.stringify(value)}`;
  }
}
