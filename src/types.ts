import { FileItem, FileSystemURI, FileAttribute, FileAttributes } from './FileSystem'

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>
} : T

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


export type FileInfo = FileItem & {
    URI: URI
    FileStateAttr?: FileState
    FileTagsAttr?: string[]
}
export type Files = FileInfo[]



export type Twofold<T> = {
    local: T
    remote: T
}

export enum SortOrder {
    Asc = 'asc',
    Desc = 'desc'
}

export interface FilterSettings {
    text: string,
    matchCase?: boolean
    wholeWord?: boolean
    useRe?: boolean
    invert?: boolean
}

export interface ExplorerConfig {
    columns?: {
        name: FileAttribute['name'],
        width: number
    }[]
    sort?: [FileAttribute['name'], SortOrder]
    history?: Path[]
    filter?: FilterSettings
}

export interface ConnectionConfig extends Twofold<ExplorerConfig> {
    scheme: string
    host: string
    port: number
    user: string
    password: string
    theme: string
    path?: Twofold<Path|undefined>
    sync?: Twofold<Path>|null
}


export interface AppConfig extends Twofold<ExplorerConfig> {
    mode?: 'light'|'system'|'dark'
    theme?: string
    timeFmt?: string
    sizeFmt?: string
    path?: Twofold<Path|undefined>
    sync?: Twofold<Path>|null
}



export interface ExplorerSettings {
    columns: (FileAttribute & { visible: boolean, width: number })[]
    sort: [FileAttribute['name'], SortOrder]
    history: Path[]
    filter: FilterSettings|null
}

export interface ConnectionSettings extends Twofold<ExplorerSettings> {
    name: string
    pwd: string
    attributes: FileAttributes
    theme: string
    path?: Twofold<Path|undefined>
    sync: Twofold<Path>|null
}

export interface AppSettings extends Twofold<ExplorerSettings> {
    home: Path
    settings: Path
    connections: Path
    keybindings: { key: CommandID, command: string }[]
    mode: AppConfig['mode']
    theme: string
    timeFmt: string
    sizeFmt: string
    path: Twofold<Path|undefined>
    sync: Twofold<Path>|null
}


export type CommandID = string
export type Command<Input extends Record<string, any>, Output> = (args: Input) => Promise<Output>
export type CommandArgs = { src: { root: URI, selected: URI[], target?: URI }, dest: { root: URI, selected: URI[] } }
export type CommandResult = { executed: boolean, message?: string, error?: Error }
export type Command1 = (args: CommandArgs) => Promise<CommandResult>




export enum QueueType {
    Copy = 'copy',
    Move = 'move',
    Download = 'download',
    Upload = 'upload',
    Remove = 'remove'
}

export enum QueueEventType {
    Start = 'start',
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
    | { type: QueueEventType.Ask, queueType: QueueType, from: FileItem, to: FileItem, sid?: string }
    | { type: QueueEventType.Complete }


export enum QueueActionType {
    Skip = 'skip',
    Replace = 'replace',
    Rename = 'rename'
}

export type QueueAction = 
    | { type: QueueActionType.Skip }
    | { type: QueueActionType.Replace }
    | { type: QueueActionType.Rename }



export enum FailureType {
    Unauthorized = 'unauthorized',
    ConfirmDeletion = 'confirm-deletion',
    ConfirmClear = 'confirm-clear',
    MissingDir = 'missing-dir',
    RemoteError = 'remote-error',
    APIError = 'api-error',
    Warning = 'warning'
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
        type: FailureType.ConfirmClear
        file: URI
    }
    | {
        type: FailureType.MissingDir
        uri: URI
    }
    | {
        type: FailureType.RemoteError
        id: ConnectionID
        message: string
    }
    | {
        type: FailureType.APIError
        message: string
        method: string
    }
    | {
        type: FailureType.Warning
        message: string
    }