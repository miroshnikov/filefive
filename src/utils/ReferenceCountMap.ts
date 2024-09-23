export default class<K, V> {

    public set(key: K, value: V): this {
        const found = this.entries.get(key)
        this.entries.set(key, found ? { count: ++found.count, value } : { count: 1, value })
        return this
    }

    public has(key: K): boolean {
        return this.entries.has(key)
    }

    public get(key: K): V|undefined {
        return this.entries.get(key)?.value
    }

    public inc(key: K): number {
        const found = this.entries.get(key)
        return found ? ++found.count : 0
    }

    public dec(key: K): V|undefined {
        const found = this.entries.get(key)
        if (found) {
            if (--found.count <= 0) {
                this.entries.delete(key)
                return found.value
            }
        }
        return undefined
    }

    public del(key: K): V|undefined {
        const found = this.entries.get(key)
        found && this.entries.delete(key)
        return found?.value
    }

    public count(key: K): number|undefined {
        return this.entries.get(key)?.count
    }

    public modify(key: K, value: V) {
        const found = this.entries.get(key)
        if (found) {
            found.value = value
            return true
        }
        return false
    }

    public keys() {
        return this.entries.keys()
    }

    public renameKey(from: K, to: K) {
        if (!this.entries.has(from)) {
            return
        }
        this.entries.has(to) ?
            this.entries.get(to).count += this.entries.get(from).count :
            this.entries.set(to, this.entries.get(from))
        this.entries.delete(from)
    }

    private entries = new Map<K, {count: number, value: V}>
}

