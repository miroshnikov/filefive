import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (path: Path, selected: Path[], connect: () => void): MenuItem[] {
    return [
        {
            id: 'connect',
            label: 'Connect...',
            click: () => connect()
        },
        {
            id: 'connect-new-tab',
            label: 'Connect in New Tab...',
            click: () => {
                const u = new URL(window.location.origin)
                u.searchParams.append('connect', path)
                window.open(u.toString(), '_blank');
            },
            separator: true
        },

        {
            id: 'edit-connection',
            label: 'Edit...',
            click: () => command$.next({ id: CommandID.Edit, uri: createURI(LocalFileSystemID, path) })
        },
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
    ]
}