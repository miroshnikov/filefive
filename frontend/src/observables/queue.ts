import { Subject } from 'rxjs'
import { QueueEvent } from '../../../src/types'

export const queue$ = new Subject<{ id: string, event: QueueEvent }>()

window.f5.onQueueUpdate((id, event) => {
    console.log({ id, event })
    queue$.next({ id, event })
})
