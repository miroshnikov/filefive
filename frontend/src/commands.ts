export enum CommandID {
    NewDir = 'new-dir',
    NewFile = 'new-file',
    NewConnection = 'new-connection'
}

export interface Command {
    id: CommandID|string
    label: string
    // target?: string
}

