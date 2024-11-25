import { QueueAction } from '../types'
import { queues } from '../queues/Queue'
import Session from '../Session'


export default function (id: string, action: QueueAction, forAll: boolean, sid?: string) {
    if (sid) {
        Session.set(sid, { action })
    }
    queues.get(id)?.resolve(action, forAll)
}