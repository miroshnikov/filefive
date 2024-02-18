import { Subject } from 'rxjs'
import { Failure } from '../../../src/types'


export const error$ = new Subject<Failure>()

window.f5.onError((error: Failure) => error$.next(error))