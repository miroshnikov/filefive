import { Subject } from 'rxjs'
import { Path  } from '../../../src/types'
import { LocalFileItem } from '../../../src/Local'

export const file$ = new Subject<{ path: Path, stat: LocalFileItem|null }>()

window.f5.onFileChange((path, stat) => file$.next({path, stat}))
