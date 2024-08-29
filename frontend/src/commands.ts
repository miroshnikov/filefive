export enum CommandID {
    Delete = 'delete',
    SelectAll = 'select-all',
    NewDir = 'new-dir',
    NewFile = 'new-file',
    Settings = 'settings',
    Connections = 'connections',
    Refresh = 'refresh'
}

export interface Command {
    id: CommandID
    label?: string
}

export const commands: Command[] = [
    { id: CommandID.Delete },
    { id: CommandID.SelectAll },
    { id: CommandID.NewDir },
    { id: CommandID.NewFile }
]
