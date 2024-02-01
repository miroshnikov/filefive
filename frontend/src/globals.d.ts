import { URI, Path, AppConfig, CommandID, ConnectionID, ConnectionConfig, Files, QueueEvent, QueueAction } from '../../src/types'


export interface F5 {
    config(): Promise<AppConfig>

    connect(file: Path): Promise<{ id: ConnectionID, config: ConnectionConfig }>
    disconnect(id: ConnectionID): void

    // onError(listener: (error: any) => void): void

    watch(dir: URI): void
    unwatch(dir: URI): void
    refresh(dir: URI): void
    onDirChange(listener: (uri: URI, files: Files) => void): void

    // execute(command: CommandID, args: {}): Promise<any>

    resolve(id: string, action: QueueAction): void
    stop(id: string): void
    onQueueUpdate(listener: (id: string, event: QueueEvent) => void): void

    // fileMenu(target: string, selected: string[]): void
}

declare global {
    interface Window {
        f5: F5
    }
}

