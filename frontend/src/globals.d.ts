import { URI, Path, AppConfig, ConnectionID, ConnectionConfig, Files, QueueEvent, QueueAction } from '../../src/types'


export interface F5 {
    config(): Promise<AppConfig>

    onError(listener: (error: any) => void): void

    connect(file: Path): Promise<{ id: ConnectionID, config: ConnectionConfig }>
    disconnect(id: ConnectionID): void

    watch(dir: URI): void
    unwatch(dir: URI): void
    refresh(dir: URI): void
    onDirChange(listener: (uri: URI, files: Files) => void): void

    copy(src: URI[], dest: URI): Promise<string>
    remove(files: URI[]): void
    open(file: Path): void

    resolve(id: string, action: QueueAction): void
    stop(id: string): void
    onQueueUpdate(listener: (id: string, event: QueueEvent) => void): void
}

declare global {
    interface Window {
        f5: F5
    }
}

