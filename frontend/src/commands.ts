export enum CommandID {
    NewDir = 'new-dir',
    NewFile = 'new-file'
}

export interface Command {
    id: CommandID|string
    label: string
    // target?: string
}

