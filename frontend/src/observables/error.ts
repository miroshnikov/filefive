import { Subject } from 'rxjs'

export const error$ = new Subject<any>()

window.f5.onError((error: any) => error$.next(error))