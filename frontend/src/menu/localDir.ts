import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../utils/URI'
import { basename } from '../utils/path'
import { MenuItem } from '../ui/components'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


export default function (path: Path, selected: Path[]): MenuItem[] {
    return [
        {
            id: 'new-dir',
            label: 'New Folder...',
            click: () => command$.next(CommandID.NewDir)
        },
        {
            id: 'new-file',
            label: 'New File...',
            click: () => command$.next(CommandID.NewFile),
            separator: true
        },

        {
            id: 'copy-path',
            label: 'Copy Path',
            click: () => navigator.clipboard.writeText(path) 
        },
        {
            id: 'copy-name',
            label: 'Copy Name',
            click: () => navigator.clipboard.writeText(basename(path)),
            separator: true
        },

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
                    ((selected.length && selected.includes(path)) ? selected : [path]).map(p => createURI(LocalFileSystemID, path)),
                    false
                )
            }
        }
    ]
}
