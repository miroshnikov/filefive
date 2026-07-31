import { Subject } from 'rxjs'
import { Path  } from '../shared/types'
import { LocalFileItem } from '../shared/FileSystem'

export const file$ = new Subject<{ path: Path, stat: LocalFileItem|null }>()

window.f5.onFileChange((path, stat) => file$.next({path, stat}))
