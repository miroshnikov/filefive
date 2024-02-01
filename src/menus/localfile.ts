// import { URI } from '../types'
// import { BrowserWindow, Menu, clipboard, shell } from 'electron'
// import { parseURI } from '../utils/URI'
// import { basename } from 'node:path'
// import { remove } from '../commands/remove'


// export function localFileContextMenu(window: BrowserWindow, target: URI, selected: URI[]) {
   
//     const path = parseURI(target)['path']

//     Menu.buildFromTemplate([
//         {
//             label: 'Open',
//             click: () => { shell.openPath(path) }
//         },
//         {
//             label: 'Reveal in Finder',
//             click: () => { shell.showItemInFolder(path) }
//         },
//         {
//             label: 'Edit in VSCode',
//             click: () => { 
//                 shell.openExternal(`vscode://file${path}`)
//                 // open files through protocol links
//                 // vscode://file/<path>
//                 // vscode-insiders://file/<path>
//             }
//         },
//         { type: 'separator' },

//         {
//             label: 'Copy Path',
//             click: () => { clipboard.writeText(path) }
//         },
//         {
//             label: 'Copy Name',
//             click: () => { clipboard.writeText(basename(path)) }
//         },
//         {
//             label: 'Copy Name without Extension',
//             click: () => { 
//                 const name = basename(path)
//                 const dot = name.lastIndexOf('.')
//                 clipboard.writeText(name.substring(0, dot > 0 ? dot : name.length)) 
//             }
//         },
//         // {
//         //     label: 'Copy URI',
//         //     click: () => { clipboard.writeText(target) }
//         // },
//         { type: 'separator' },

//         {
//             label: 'Delete',
//             click: () => { remove({ paths: selected.length ? selected : [target], window }) }
//         },

//     ]).popup({window}) 
// }
