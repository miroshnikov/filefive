import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { 
    Path, 
    ConnectionID, 
    URI, 
    Files, 
    Failure, 
    FailureType, 
    QueueEvent, 
    QueueAction, 
    LocalFileSystemID, 
    AppSettings,
    DeepPartial
} from './types'
import Connection from './Connection'
import LocalWatcher from './LocalWatcher'
import FileWatcher from './FileWatcher'
import RemoteWatcher from './RemoteWatcher'
import { queues } from './queues/Queue'
import Password from './Password'
import { commands } from './commands'
import transform from './transform'
import { touch, stat, LocalFileInfo } from './Local'
import { createURI } from './utils/URI'
import { SaveConnectionSettings } from './commands/saveConnection'
import { inspect } from 'node:util'


export type Emitter = <Event extends {}>(channel: string) => (event: Event) => void

export default class App {
       
    static async bootstrap(handle: (name: string, handler: (args: {}) => any) => void, emitter: Emitter, opener: (file: string) => void) {

        const dataPath = join(homedir(), '.f5')
        const connPath = join(dataPath, 'connections')
        mkdir(connPath, { recursive: true })
        touch(join(dataPath, 'credentials.json'), JSON.stringify([]))
        const settingsPath = join(dataPath, 'settings.json')
        if (!stat(settingsPath)) {
            await touch(settingsPath)
            commands.saveSettings(settingsPath, await commands.getSettings(settingsPath))
        }
               
        Password.load(dataPath, id => App.onError({ type: FailureType.Unauthorized, id }))
        Connection.initialize()

        Object.entries({
            getapp:       () => commands.getSettings(settingsPath),
            saveapp:      ({settings}: {settings: DeepPartial<AppSettings>}) => commands.saveSettings(settingsPath, settings),

            connect:      ({file}: {file: Path}) => commands.connect(file, (id, {message}) => this.onError({ type: FailureType.RemoteError, id, message })),
            login:        ({id, password, remember}: {id: ConnectionID, password: string|false, remember: boolean}) => Password.set(id, password, remember),
            disconnect:   ({id}: {id: ConnectionID}) => Connection.close(id),

            watch:        ({dir}: {dir: URI}) => commands.watch(dir, this.localWatcher, this.remoteWatcher, this.fileWatcher),
            unwatch:      ({dir}: {dir: URI}) => commands.unwatch(dir, this.localWatcher, this.remoteWatcher, this.fileWatcher),
            refresh:      ({dir}: {dir: URI}) => this.remoteWatcher.refresh(dir),

            copy:         ({src, dest, move}: {src: URI[], dest: URI, move: boolean}) => commands.copy(src, dest, move),
            remove:       ({files, force}: {files: URI[], force: boolean}) => commands.remove(files, force, connPath),
            open:         ({file}: {file: Path}) => opener(file),
            mkdir:        ({name, parent}: {name: string, parent: URI}) => commands.mkdir(name, parent),
            read:         ({file}: {file: URI}) => commands.read(file),
            write:        ({path, content}: {path: URI, content: string}) => commands.write(path, content),
            rename:       ({path, name}: {path: URI, name: string}) => commands.rename(path, name),

            get:          ({path}: {path: Path}) => commands.getConnection(path),
            save:         ({path, settings}: {path: Path, settings: SaveConnectionSettings}) => commands.saveConnection(path, settings),

            resolve:      ({id, action, forAll}: {id: string, action: QueueAction, forAll: boolean}) => queues.get(id)?.resolve(action, forAll),
            stop:         ({id}: {id: string}) => queues.get(id)?.stop()
        }).forEach(([name, handler]) => handle(name, handler))

        const emitError = emitter<Failure>('error')
        this.onError = (error: Failure) => emitError(error)

        const emitDir = emitter<{uri: URI, files: Files}>('dir')
        const sendDirContent = (uri: URI, files: Files) => emitDir({uri, files})
        this.localWatcher = new LocalWatcher(
            (path, files) => 
                sendDirContent(
                    createURI(LocalFileSystemID, path), 
                    files.map(f => ({...f, URI: createURI(LocalFileSystemID, f.path)}))
                ),
            path => this.onError({ type: FailureType.MissingDir, uri: createURI(LocalFileSystemID, path) }), 
        )
        this.remoteWatcher = new RemoteWatcher(
            sendDirContent, 
            uri => this.onError({ type: FailureType.MissingDir, uri }), 
            transform
        )

        const emitFile = emitter<{path: Path, stat: LocalFileInfo|null}>('file')
        const sendFileStat = (path: Path, stat: LocalFileInfo|null) => emitFile({path, stat})
        this.fileWatcher = new FileWatcher(sendFileStat)

        const emitQueue = emitter<{id: string, event: QueueEvent}>('queue')
        this.onQueueUpdate = (id: string, event: QueueEvent) => emitQueue({id, event})
    }

    public static onError: (error: Failure) => void
    public static onQueueUpdate: (id: string, event: QueueEvent) => void

    private static localWatcher: LocalWatcher
    private static fileWatcher: FileWatcher
    public static remoteWatcher: RemoteWatcher
}
