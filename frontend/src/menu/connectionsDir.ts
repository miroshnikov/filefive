import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui'
import { basename } from '../utils/path'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'
import localDir from './localDir'


export default function (path: Path, selected: Path[]): MenuItem[] {
    return [
        {
            id: 'new-file',
            label: 'New Connection...',
            click: () => command$.next(CommandID.NewFile),
            separator: true
        },
        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => command$.next(CommandID.NewDir)
        },
        ...localDir(path, selected).slice(2)    
    ]
    
}