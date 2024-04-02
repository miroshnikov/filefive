import { Path, LocalFileSystemID } from '../../../src/types'
import { createURI } from '../../../src/utils/URI'
import { MenuItem } from '../ui/components'
import { basename } from '../utils/path'


export default function (path: Path, selected: Path[], connect: () => void): MenuItem[] {
    return [
        {
            id: 'connect',
            label: 'Connect',
            click: () => connect(),
            separator: true
        },

        {
            id: 'edit-connection',
            label: 'Edit',
            click: () => {} // issue command that read and then write file
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
                    ((selected.length && selected.includes(path)) ? selected : [path]).map(path => createURI(LocalFileSystemID, path)),
                    false
                )
            }
        }
    ]
}