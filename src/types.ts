import { FileSystemURI } from './FileSystem'

export const LocalFileSystemID = 'file://'

export type ConnectionID = FileSystemURI | typeof LocalFileSystemID

export type Path = string

export type URI = `${ConnectionID}/${Path}`

export type FileInfo = {
    URI: URI
    path: Path
    name: string
    dir: boolean
    size: number
    modified: Date
    // Symbol('tags'): string[]
} & {[key: string]: any}        

export type Files = FileInfo[]

export interface AppConfig {
    paths: Record<'home'|'connections', Path>
}

export interface ConnectionConfig {
    pwd: Path
}


export type CommandID = string
export type Command<Input extends Record<string, any>, Output> = (args: Input) => Promise<Output>
export type CommandArgs = { src: { root: URI, selected: URI[], target?: URI }, dest: { root: URI, selected: URI[] } }
export type CommandResult = { executed: boolean, message?: string, error?: Error }
export type Command1 = (args: CommandArgs) => Promise<CommandResult>




export enum QueueType {
    Download = 'download',
    Upload = 'upload',
    Remove = 'remove'
}

export enum QueueEventType {
    Create = 'create',
    Update = 'update',
    Ask = 'ask',
    Complete = 'complete'
}

export interface QueueState {
    totalCnt: number
    doneCnt: number
    totalSize: number
    doneSize: number
    pending: number
}

export type QueueEvent = 
    | { type: QueueEventType.Create, queueType: QueueType, connection: ConnectionID }
    | { type: QueueEventType.Update, state: QueueState }
    | { type: QueueEventType.Ask, from: FileInfo, to: FileInfo }
    | { type: QueueEventType.Complete }


export enum QueueActionType {
    Skip,
    Replace
    // Rename
}

export type QueueAction = 
    | { type: QueueActionType.Skip }
    | { type: QueueActionType.Replace }
