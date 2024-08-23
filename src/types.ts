import { FileSystemURI, FileAttribute, FileAttributes } from './FileSystem'

export const LocalFileSystemID = 'file://'

export type ConnectionID = FileSystemURI | typeof LocalFileSystemID

export type Path = string

export type URI = `${ConnectionID}/${Path}`


export const FileStateAttr = Symbol.for('state')
export enum FileState {
    Creating = 'creating',
    Renaming = 'renaming'
}

export const FileTagsAttr = Symbol.for('tags')

export type FileInfo = {
    URI: URI
    path: Path
    name: string
    dir: boolean
    size: number
    modified: Date
    FileStateAttr?: FileState
    FileTagsAttr?: string[]
} & {[key: string|symbol]: any}

export type Files = FileInfo[]



export type Twofold<T> = {
    local: T
    remote: T
}

export enum SortOrder {
    Asc = 'asc',
    Desc = 'desc'
}

export interface ExplorerConfig {
    columns: {
        name: FileAttribute['name'],
        width: number
    }[]
    sort: [FileAttribute['name'], SortOrder]
}

export interface Config {
    scheme: string
    host: string
    port: number
    user: string
    layout?: Twofold<ExplorerConfig>
    paths?: Twofold<Path|undefined>
}



export interface ExplorerSettings {
    columns: (FileAttribute & { visible: boolean, width: number })[]
    sort: [FileAttribute['name'], SortOrder]
}

export interface ConnectionSettings {
    name: string
    attributes: FileAttributes
    layout: Twofold<ExplorerSettings>
    paths: Twofold<Path|undefined>
}

export interface AppSettings {
    paths: Record<'home'|'connections', Path>
    layout: Twofold<ExplorerSettings>
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



export enum FailureType {
    Unauthorized = 'unauthorized',
    ConfirmDeletion = 'confirm-deletion',
    RemoteError = 'remote-error'
}
export type Failure =
    | {
        type: FailureType.Unauthorized 
        id: ConnectionID
    }
    | {
        type: FailureType.ConfirmDeletion
        files: URI[]
    }
    | {
        type: FailureType.RemoteError
        id: ConnectionID
        error: Error
    }