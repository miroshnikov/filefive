import { Subject } from 'rxjs'
import { QueueEvent, QueueEventType } from '../../../src/types'

const queues = new Set<string>()

export function createQueue(id: string) {
    id && queues.add(id)
}

export const queue$ = new Subject<{ id: string, event: QueueEvent }>()

window.f5.onQueueUpdate((id, event) => {
    if (queues.has(id)) {
        queue$.next({ id, event })
        if (event.type == QueueEventType.Complete) {
            queues.delete(id)
        }
    }
})



