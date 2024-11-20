import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


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
                click: () => command$.next({ id: CommandID.Rename, uri: createURI(LocalFileSystemID, path) })
            },
            {
                id: CommandID.Duplicate,
                label: 'Duplicate',
                click: () => command$.next({ id: CommandID.Duplicate, uri: createURI(LocalFileSystemID, path) })
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