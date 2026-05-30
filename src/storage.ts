export interface VariableStorage<T> {
    set(key: string, value: T): void;
    get(key: string): T;
    delete(key: string): void;
}

export class RamKv<T> implements VariableStorage<T> {
    private storage: Map<string, T>;

    constructor() {
        this.storage = new Map();
    }

    set(key: string, value: T) {
        this.storage.set(key, value);
    }
    get(key: string) {
        if (!this.storage.has(key)) {
            throw new Error(`Key '${key}' not found`);
        }
        return this.storage.get(key)!;
    }
    delete(key: string) {
        this.storage.delete(key);
    }
}