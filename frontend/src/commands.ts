import { URI } from '../../src/types'


export enum CommandID {
    Delete = 'delete',
    SelectAll = 'select-all',
    NewDir = 'new-dir',
    NewFile = 'new-file',
    Settings = 'settings',
    Connections = 'connections',
    Refresh = 'refresh',
    Rename = 'rename',
    CopyPath = 'copy-path',
    CopyRelativePath = 'copy-relative-path',
    CopyName = 'copy-name'
}


export type Command = { label?: string } & (
    | { id: Exclude<CommandID, CommandID.Rename|CommandID.CopyPath|CommandID.CopyRelativePath|CommandID.CopyName> }
    | { 
        id: CommandID.Rename|CommandID.CopyPath|CommandID.CopyRelativePath|CommandID.CopyName, 
        uri?: URI
     } 
)

