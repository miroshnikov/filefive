import { URI } from '../../src/types'


export enum CommandID {
    Transfer = 'transfer',
    Delete = 'delete',
    SelectAll = 'select-all',
    NewDir = 'new-dir',
    NewFile = 'new-file',
    Settings = 'settings',
    Connections = 'connections',
    Refresh = 'refresh',
    CollapseAll = 'collapse-all',
    ShowFilter = 'show-filter',
    
    Rename = 'rename',
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
    | CommandID.Transfer
    | CommandID.Delete
    | CommandID.SelectAll
    | CommandID.NewDir
    | CommandID.NewFile
    | CommandID.Settings
    | CommandID.Connections
    | CommandID.Refresh
    | CommandID.CollapseAll
    | CommandID.ShowFilter
    | CommandID.TriggerCopy
    | CommandID.TriggerPaste

type FileCommand = 
    | CommandID.Rename
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

