import { Subject } from 'rxjs'
import { Command } from '../commands'

export const command$ = new Subject<Command['id']>()