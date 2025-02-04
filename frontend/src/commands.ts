import { URI } from '../../src/types'


export enum CommandID {
    Transfer = 'transfer',
    Delete = 'delete',
    SelectAll = 'select-all',
    SelectAllFiles = 'select-all-files',
    NewDir = 'new-dir',
    NewFile = 'new-file',
    Settings = 'settings',
    Connections = 'connections',
    Refresh = 'refresh',
    CollapseAll = 'collapse-all',
    ShowFilter = 'show-filter',
    GoBack = 'go-back',
    GoForward = 'go-forward',
    SyncBrowsing = 'sync-browsing',
    
    Rename = 'rename',
    Duplicate = 'duplicate',
    ClearContents = 'clear-contents',
    Edit = 'edit',
    CopyURI = 'copy-uri',
    CopyPath = 'copy-path',
    CopyRelativePath = 'copy-relative-path',
    CopyName = 'copy-name',
    CopyNameNoExt = 'copy-name-no-ext',
    Paste = 'paste',
    Copy = 'copy',
    TriggerCopy = 'trigger-copy',
    TriggerPaste = 'trigger-paste'
}

export type KeyShortcutCommand = 
    | CommandID.Delete
    | CommandID.SelectAll
    | CommandID.SelectAllFiles
    | CommandID.NewDir
    | CommandID.NewFile
    | CommandID.Settings
    | CommandID.Connections
    | CommandID.Refresh
    | CommandID.CollapseAll
    | CommandID.ShowFilter
    | CommandID.TriggerCopy
    | CommandID.TriggerPaste
    | CommandID.GoBack
    | CommandID.GoForward
    | CommandID.SyncBrowsing

type FileCommand = 
    | CommandID.Transfer
    | CommandID.Rename
    | CommandID.Duplicate
    | CommandID.ClearContents
    | CommandID.Edit
    | CommandID.CopyURI
    | CommandID.CopyPath
    | CommandID.CopyRelativePath
    | CommandID.CopyName
    | CommandID.CopyNameNoExt

export type Command = { label?: string } & (
    | { id: KeyShortcutCommand, e?: KeyboardEvent }
    | { 
        id: FileCommand, 
        uri?: URI
      } 
    | { id: CommandID.Paste, files?: File[], uris?: URI[] }
    | { id: CommandID.Copy, e: ClipboardEvent }
)

