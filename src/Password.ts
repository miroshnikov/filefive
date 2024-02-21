import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ConnectionID } from './types'


export default class Passwords {

    static async load(dir: string, onMiss: (id: ConnectionID) => void) {
        this.saveFile = join(dir, 'credentials.json')
        this.resolve = onMiss
        this.store = new Map(
            (JSON.parse(
                (await readFile(this.saveFile)).toString()
            ) as [ConnectionID, string][]).map(([id, password]) => [id, [password, true]])
        )
    }

    static set(id: ConnectionID, password: string, save = false) {
        this.store.set(id, [password, save])
        this.pending.get(id)?.(password)
        save && this.save()
    }

    static async get(id: ConnectionID): Promise<string> {
        if (this.store.has(id)) {
            return this.store.get(id)[0]
        }
        const p = new Promise<string>((resolve) => this.pending.set(id, resolve))
        this.resolve(id)
        return p
    }

    static delete(id: ConnectionID) {
        const found = this.store.get(id)
        this.store.delete(id)
        this.pending.delete(id)
        found?.[1] == true && this.save()
    }


    private static save() {
        writeFile(
            this.saveFile,
            JSON.stringify(
                Array.from(this.store.entries())
                    .filter(([, [, save]]) => save)
                    .map(([id, [password,]]) => [id, password])
            )            
        )
    }

    private static store: Map<ConnectionID, [string, boolean]>
    private static saveFile = ''
    private static resolve: (key: ConnectionID) => void
    private static pending = new Map<ConnectionID, (password: string) => void>()
}
