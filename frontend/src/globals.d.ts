import { 
    URI, 
    Path, 
    AppSettings, 
    ConnectionID, 
    ConnectionSettings, 
    ConnectionConfig, 
    Files, 
    QueueEvent, 
    QueueAction, 
    DeepPartial,
    FilterSettings 
} from '../../src/types'
import { LocalFileInfo } from '../../src/Local'
import { SaveConnectionSettings } from '../../src/commands/saveConnection'


export interface F5 {
    settings(): Promise<AppSettings>
    saveSettings(settings: DeepPartial<AppSettings>): Promise<void>

    onError(listener: (error: any) => void): void

    connect(file: Path, signal: AbortSignal): Promise<{ id: ConnectionID, sid: string, settings: ConnectionSettings } | false>
    login(id: ConnectionID, password: string|false, remember: boolean): Promise<void>
    disconnect(id: ConnectionID, sid: string): void

    watch(dir: URI): void
    unwatch(dir: URI): void
    refresh(dir: URI): void

    onDirChange(listener: (uri: URI, files: Files) => void): void
    onFileChange(listener: (path: Path, stat: LocalFileInfo|null) => void): void

    copy(src: URI[], dest: URI, move?: boolean, filter?: FilterSettings, sid?: string): Promise<string>
    duplicate(src: URI[], filter?: FilterSettings): Promise<void>
    remove(files: URI[]): void
    clear(file: URI): void
    open(file: Path): void
    mkdir(name: string, parent: URI): Promise<void>
    read(file: URI): Promise<string>
    write(path: URI, content: string): Promise<void>
    rename(path: URI, name: string): Promise<void>

    get(path: Path): Promise<ConnectionConfig|null>
    save(path: Path, settings: SaveConnectionSettings): Promise<void>

    resolve(id: string, action: QueueAction, forAll: boolean, sid?: string): void
    stop(id: string): void
    onQueueUpdate(listener: (id: string, event: QueueEvent) => void): void
}

declare global {
    interface Window {
        f5: F5
    }
}

