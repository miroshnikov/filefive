import { Subject } from 'rxjs'
import { URI, Files } from '../shared/types'

export const dir$ = new Subject<{ dir: URI, files: Files }>()

window.f5.onDirChange((dir, files) => dir$.next({dir, files}))
