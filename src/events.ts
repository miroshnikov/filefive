import { Subject } from 'rxjs'
import { ConnectionID, ConnectionSettings, Path } from './types'

export enum SystemEventType {
    Connect = 'connect',
    Disconnect = 'disconnect'
}

export type SystemEvent = 
    | {
        type: SystemEventType.Connect
        id: ConnectionID
        sid: string
        settings: ConnectionSettings
        file: Path
    }
    | {
        type: SystemEventType.Disconnect
        id: ConnectionID
        sid: string
    }

export const event$ = new Subject<SystemEvent>()