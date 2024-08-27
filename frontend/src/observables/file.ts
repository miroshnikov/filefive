import { Subject } from 'rxjs'
import { Path  } from '../../../src/types'
import { LocalFileInfo } from '../../../src/Local'

export const file$ = new Subject<{ path: Path, stat: LocalFileInfo|null }>()

window.f5.onFileChange((path, stat) => file$.next({path, stat}))
