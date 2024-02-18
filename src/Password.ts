import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'


export default class Passwords {

    static async load(dir: string, onMiss: (key: string) => void) {
        this.saveFile = join(dir, 'credentials.json')
        this.resolve = onMiss
        this.store = new Map(
            (JSON.parse(
                (await readFile(this.saveFile)).toString()
            ) as [string, string][]).map(([key, password]) => [key, [password, true]])
        )
    }

    static set(key: string, password: string, save = false) {
        this.store.set(key, [password, save])
        this.pending.get(key)?.(password)
        save && this.save()
    }

    static async get(key: string): Promise<string> {
        if (this.store.has(key)) {
            return this.store.get(key)[0]
        }
        const p = new Promise<string>((resolve) => this.pending.set(key, resolve))
        this.resolve(key)
        return p
    }

    static delete(key: string) {
        const found = this.store.get(key)
        this.store.delete(key)
        this.pending.delete(key)
        found?.[1] == true && this.save()
    }


    private static save() {
        writeFile(
            this.saveFile,
            JSON.stringify(
                Array.from(this.store.entries())
                    .filter(([, [, save]]) => save)
                    .map(([key, [password,]]) => [key, password])
            )            
        )
    }

    private static store: Map<string, [string, boolean]>
    private static saveFile = ''
    private static resolve: (key: string) => void
    private static pending = new Map<string, (password: string) => void>()
}
