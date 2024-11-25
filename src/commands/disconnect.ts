import { ConnectionID } from '../types'
import Session from '../Session'
import Connection from '../Connection'


export default function (id: ConnectionID, sid: string) {
    Session.remove(sid)
    Connection.close(id)
}