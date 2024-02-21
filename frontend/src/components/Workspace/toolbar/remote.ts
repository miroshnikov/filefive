import { ToolbarItem } from '../../Toolbar/Toolbar'
import { ConnectionID } from '../../../../../src/types'

// export default function (connectionId: ConnectionID, selected: Path[]): ToolbarItem[] {
//     return [
//         {
//             id: 'Copy',
//             icon: connectionId ? 'download' : 'file_copy',
//             disabled: !selected.length,
//             onClick: () => window.f5.copy(
//                 selected.map(path => (connectionId ?? LocalFileSystemID) + path) as URI[], 
//                 LocalFileSystemID + localPath as URI
//             )
//         },
//     ]
// }