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

    static set(id: ConnectionID, password: string|false, remember: boolean, save: boolean) {
        if (password === false) {
            this.pending.get(id)?.[1]()
        } else {
            this.pending.get(id)?.[0](password);
            remember && this.store.set(id, [password, save]);
            save && this.dump()
        }
    }

    static async get(id: ConnectionID, skipMissing = false): Promise<string> {
        if (this.store.has(id)) {
            return this.store.get(id)[0]
        }
        if (skipMissing) {
            return ''
        }
        const p = new Promise<string>((resolve, reject) => this.pending.set(id, [resolve, reject]))
        this.resolve(id)
        return p
    }

    static delete(id: ConnectionID, save: boolean) {
        const found = this.store.get(id)
        if (found && (save || found[1] === save)) {
            this.store.delete(id)
            found[1] === true && this.dump()
        }
        this.pending.delete(id)
    }


    private static dump() {
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
    private static pending = new Map<ConnectionID, [(password: string) => void, () => void]>()
}
