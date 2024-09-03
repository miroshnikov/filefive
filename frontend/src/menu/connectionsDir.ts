import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../utils/URI'
import { MenuItem } from '../ui/components'
import { basename } from '../utils/path'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'
import localDir from './localDir'


export default function (path: Path, selected: Path[], isRoot: boolean): MenuItem[] {
    return [
        {
            id: 'new-file',
            label: 'New Connection...',
            click: () => command$.next({id: CommandID.NewFile}),
        },
        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => command$.next({id: CommandID.NewDir}),
            separator: !isRoot
        },
        ...(isRoot ? [] : [ 
            {
                id: 'rename',
                label: 'Rename...',
                click: () => {}
            },
            {
                id: 'delete',
                label: 'Delete',
                click: () => {
                    window.f5.remove(
                        ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                        false
                    )
                }
            }
        ])
    ]
    
}