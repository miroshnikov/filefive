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
    
    Rename = 'rename',
    Edit = 'edit',
    CopyURI = 'copy-uri',
    CopyPath = 'copy-path',
    CopyRelativePath = 'copy-relative-path',
    CopyName = 'copy-name'
}

type FileCommand = 
    |CommandID.Rename
    |CommandID.Edit
    |CommandID.CopyURI
    |CommandID.CopyPath
    |CommandID.CopyRelativePath
    |CommandID.CopyName

export type Command = { label?: string } & (
    | { id: Exclude<CommandID, FileCommand> }
    | { 
        id: FileCommand, 
        uri?: URI
     } 
)

