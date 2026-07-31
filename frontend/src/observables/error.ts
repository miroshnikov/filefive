import { Subject } from 'rxjs'
import { Failure } from './../shared/types'

export const error$ = new Subject<Failure>()