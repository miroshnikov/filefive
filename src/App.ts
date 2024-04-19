import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs';
import { join } from 'node:path'
import { AppConfig, Path, ConnectionID, ConnectionConfig, URI, Files, Failure, FailureType } from './types'
import Connection from './Connection'
import LocalWatcher from './LocalWatcher'
import RemoteWatcher from './RemoteWatcher'
import { isLocal, parseURI, connectionID } from './utils/URI'
import { queues } from './Queue'
import { QueueEvent, QueueAction } from './types'
import Password from './Password'
import { commands } from './commands'
import transform from './transform'
import { touch } from './Local'


interface ConnectionSettings {
    scheme: string
    host: string
    port: number
    user: string
}

export type Emitter = <Event extends {}>(channel: string) => (event: Event) => void


export default class App {
       
    static bootstrap(handle: (name: string, handler: (args: {}) => any) => void, emitter: Emitter, opener: (file: string) => void) {

        const dataPath = join(homedir(), '.f5')
        const connPath = join(dataPath, 'connections')
        mkdir(connPath, { recursive: true })
        touch(join(dataPath, 'credentials.json')) // TODO write "[]" if empty
               
        Password.load(dataPath, id => App.onError({ type: FailureType.Unauthorized, id }))
        Connection.initialize()

        Object.entries({
            config:     () => this.config(),
            connect:    ({file}: {file: Path}) => this.connect(file),
            login:      ({id, password, remember}: {id: ConnectionID, password: string, remember: boolean}) => Password.set(id, password, remember),
            disconnect: ({id}: {id: ConnectionID}) => Connection.close(id),
            watch:      ({dir}: {dir: URI}) => isLocal(dir) ? this.localWatcher.watch(parseURI(dir)['path']) : this.remoteWatcher.watch(dir),
            unwatch:    ({dir}: {dir: URI}) => isLocal(dir) ? this.localWatcher.unwatch(parseURI(dir)['path']) : this.remoteWatcher.unwatch(dir),
            refresh:    ({dir}: {dir: URI}) => this.remoteWatcher.refresh(dir),
            copy:       ({src, dest}: {src: URI[], dest: URI}) => commands.copy(src, dest),
            remove:     ({files, force}: {files: URI[], force: boolean}) => commands.remove(files, force, connPath),
            open:       ({file}: {file: Path}) => opener(file),
            mkdir:      ({name, parent}: {name: string, parent: URI}) => commands.mkdir(name, parent),
            // read
            write:      ({path, content}: {path: URI, content: string}) => commands.write(path, content, connPath),
            resolve:    ({id, action}: {id: string, action: QueueAction}) => queues.get(id)?.resolve(action),
            stop:       ({id}: {id: string}) => queues.get(id)?.close()
        }).forEach(([name, handler]) => handle(name, handler))

        const emitError = emitter<Failure>('error')
        this.onError = (error: Failure) => emitError(error)

        const emitFS = emitter<{uri: URI, files: Files}>('fs')
        const sendDirContent = (uri: URI, files: Files) => emitFS({uri, files})
        this.localWatcher = new LocalWatcher((path, files) => sendDirContent('file://'+path as URI, files))
        this.remoteWatcher = new RemoteWatcher(sendDirContent, transform)

        const emitQueue = emitter<{id: string, event: QueueEvent}>('queue')
        this.onQueueUpdate = (id: string, event: QueueEvent) => emitQueue({id, event})
    }

    public static onError: (error: Failure) => void
    public static onQueueUpdate: (id: string, event: QueueEvent) => void



    private static config(): AppConfig {
        return {
            paths: {
                home: homedir(),
                connections: join(homedir(), '.f5', 'connections')
            }
        }
    }

    private static async connect(file: Path): Promise<{ id: ConnectionID, config: ConnectionConfig } | false> {
        const {scheme, user, host, port} = JSON.parse( readFileSync(file).toString() ) as ConnectionSettings
        const id = connectionID(scheme, user, host, port)
        await Password.get(id)
        try {
            await Connection.open(scheme, user, host, port)
            const pwd = await Connection.get(id).pwd()
            return { id, config: { pwd } }
        } catch (error) {
            App.onError({ type: FailureType.RemoteError, id, error })
            return false
        }
    }

    private static localWatcher: LocalWatcher
    public static remoteWatcher: RemoteWatcher
}
