import { URI } from '../../src/types'


export enum CommandID {
    Copy = 'copy',
    Delete = 'delete',
    SelectAll = 'select-all',
    NewDir = 'new-dir',
    NewFile = 'new-file',
    Settings = 'settings',
    Connections = 'connections',
    Refresh = 'refresh',
    CollapseAll = 'collapse-all',
    
    Rename = 'rename',
    Edit = 'edit',
    CopyURI = 'copy-uri',
    CopyPath = 'copy-path',
    CopyRelativePath = 'copy-relative-path',
    CopyName = 'copy-name',
    Paste = 'paste',
    CopyToClipboard = 'copy-clipboard'
}

export type KeyShortcutCommand = 
    | CommandID.Copy
    | CommandID.Delete
    | CommandID.SelectAll
    | CommandID.NewDir
    | CommandID.NewFile
    | CommandID.Settings
    | CommandID.Connections
    | CommandID.Refresh
    | CommandID.CollapseAll

type FileCommand = 
    | CommandID.Rename
    | CommandID.Edit
    | CommandID.CopyURI
    | CommandID.CopyPath
    | CommandID.CopyRelativePath
    | CommandID.CopyName

export type Command = { label?: string } & (
    | { id: KeyShortcutCommand }
    | { 
        id: FileCommand, 
        uri?: URI
      } 
    | { id: CommandID.Paste, files?: File[], uris?: URI[] }
    | { id: CommandID.CopyToClipboard, data: DataTransfer }
)

