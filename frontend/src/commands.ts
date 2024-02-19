export enum CommandID {
    NewDir = 'new-dir'
}

export interface Command {
    id: CommandID|string
    label: string
    // target?: string
}

