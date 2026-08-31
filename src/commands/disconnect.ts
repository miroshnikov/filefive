import { ConnectionID } from '../types'
import Session from '../Session'
import Connection from '../Connection'
import { SystemEventType, event$ } from '../events'


export default function (id: ConnectionID, sid: string) {
    event$.next({ type: SystemEventType.Disconnect, id, sid })
    Session.remove(sid)
    Connection.close(id)
}