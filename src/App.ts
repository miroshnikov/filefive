import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs';
import { join } from 'node:path'
import { AppConfig, Path, ConnectionID, ConnectionConfig, CommandID, URI, Files } from './types'
import Connection from './Connection'
import LocalWatcher from './LocalWatcher'
import RemoteWatcher from './RemoteWatcher'
import { isLocal, parseURI } from './utils/URI'
import { queues } from './Queue'
import { QueueEvent, QueueAction } from './types'
import Password from './Password'
import { commands } from './commands'
import logger from './log'
import transform from './transform'
import { touch } from './Local'



interface ConnectionSettings {
    scheme: string
    host: string
    port: number
    user: string
}

export type Notifier = <Event extends {}>(name: string) => (event: Event) => void


export default class App {
       
    static bootstrap(
        handle: (name: string, handler: (args: {}) => any) => void,
        notify: Notifier
    ) {
        const dataPath = join(homedir(), '.f5')
        mkdir(join(dataPath, 'connections'), { recursive: true })
        touch(join(dataPath, 'credentials.json')) // TODO write "[]" if empty
               
        Password.load(dataPath)
        Connection.initialize()

        Object.entries({
            config:     () => this.config(),
            connect:    ({file}: {file: Path}) => this.connect(file),
            disconnect: ({id}: {id: ConnectionID}) => Connection.close(id),
            watch:      ({dir}: {dir: URI}) => this.watch(dir),
            unwatch:    ({dir}: {dir: URI}) => this.unwatch(dir),
            refresh:    ({dir}: {dir: URI}) => this.remoteWatcher.refresh(dir),
            resolve:    ({id, action}: {id: string, action: QueueAction}) => queues.get(id)?.resolve(action),
            stop:       ({id}: {id: string}) => queues.get(id)?.close(),
        }).forEach(([name, handler]) => handle(name, handler))

/* 
        Object.entries({
            config:     () => this.config(app),
            connect:    (file: Path) => this.connect(file),
            disconnect: (id: ConnectionID) => Connection.close(id),
            watch:      (dir: URI) => this.watch(dir),
            unwatch:    (dir: URI) => this.unwatch(dir),
            execute:    (command: CommandID, args: {}) => (commands as Record<CommandID, Function>)[command](args), // ?
            refresh:    (dir: URI) => this.remoteWatcher.refresh(dir),
            // copy
            // remove
            // read
            // write
            resolve:    (id: string, action: QueueAction) => queues.get(id)?.resolve(action),
            stop:       (id: string) => queues.get(id)?.close(),
            fileMenu:   (target: URI, selected: URI[]) => this.fileMenu(target, selected, mainWindow)
        }).forEach(([name, f]) => ipcMain.handle(name, (_, ...args) => f.apply(this, args)))

        this.onError = (error: any) => { logger.error(error); mainWindow.webContents.send('error', error) }
        this.onQueueUpdate = (id: string, event: QueueEvent) => mainWindow.webContents.send('queue-update', id, event)
        
        const sendDirContent = (uri: URI, files: Files)      => mainWindow.webContents.send('dir-change', uri, files)
        this.localWatcher = new LocalWatcher((path, files) => sendDirContent('file://'+path as URI, files))
        this.remoteWatcher = new RemoteWatcher(sendDirContent, transform)
*/
    
        const notifyFS = notify<{uri: URI, files: Files}>('fs')
        const sendDirContent = (uri: URI, files: Files) => notifyFS({uri, files})
        this.localWatcher = new LocalWatcher((path, files) => sendDirContent('file://'+path as URI, files))
        this.remoteWatcher = new RemoteWatcher(sendDirContent, transform)

        const notifyQueue = notify<{id: string, event: QueueEvent}>('queue')
        this.onQueueUpdate = (id: string, event: QueueEvent) => notifyQueue({id, event})
    }

    public static onError: (error: any) => void
    public static onQueueUpdate: (id: string, event: QueueEvent) => void



    private static config(): AppConfig {
        return {
            paths: {
                home: homedir(),
                connections: join(homedir(), '.f5', 'connections')
            }
        }
    }

    private static async connect(file: Path): Promise<{ id: ConnectionID, config: ConnectionConfig }> {
        const {scheme, user, host, port} = JSON.parse( readFileSync(file).toString() ) as ConnectionSettings
        const id = await Connection.open(scheme, user, host, port)
        return { id, config: { pwd: await Connection.get(id).pwd() } }
    }

    private static watch(uri: URI) {
        isLocal(uri) ? this.localWatcher.watch(parseURI(uri)['path']) : this.remoteWatcher.watch(uri)
    }

    private static unwatch(uri: URI) {
        isLocal(uri) ? this.localWatcher.unwatch(parseURI(uri)['path']) : this.remoteWatcher.unwatch(uri)
    }

    private static localWatcher: LocalWatcher
    public static remoteWatcher: RemoteWatcher
}
