import React, { useState, useContext } from "react"
import { LocalFileSystemID, URI, Path, SortOrder, ExplorerSettings } from '../../../src/types'
import { FileAttributeType } from '../../../src/FileSystem'
import { AppSettingsContext } from '../context/config'
import { MenuItem } from '../ui/components'
import { parseURI } from '../../../src/utils/URI'
import Explorer from './Explorer/Explorer'
import dirMenu from '../menu/connectionsDir'
import fileMenu from '../menu/connection'
import ConnectionForm from '../modals/Connection/Connection'
import { ToolbarItem } from './Toolbar/Toolbar'
import { useSubscribe } from '../hooks'
import { CommandID } from '../commands'
import { command$ } from '../observables/command'


interface Props {
    path: Path
    onChange: (dir: Path) => void
    onSelect: (paths: Path[]) => void
    connect: (path: Path) => void
    toolbar: ToolbarItem[]
    tabindex: number
    onFocus: () => void
    onBlur: () => void
}

const settings: ExplorerSettings = {
    columns: [
        {
            name: "name",     
            type: FileAttributeType.String, 
            title: "Name",
            visible: true,
            width: 300
        },
        {
            name: "modified", 
            type: FileAttributeType.Date, 
            title: "Last Modified",
            visible: true,
            width: 300
        }
    ],
    sort: ['name', SortOrder.Asc],
    history: []
}

export default function Connections({ path, onChange, onSelect, connect, toolbar, onFocus, onBlur, tabindex }: Props) {
    const appSettings = useContext(AppSettingsContext)

    const [selected, setSelected] = useState<Path[]>([])
    const [menu, setMenu] = useState<MenuItem[]>([])
    const [connectionFile, setConnectionFile] = useState<Path>('')

    useSubscribe(() => command$.subscribe(cmd => {
        if (cmd.id == CommandID.Edit && cmd.uri) {
            const {id, path} = parseURI(cmd.uri)
            if (id == LocalFileSystemID && path.startsWith(appSettings.connections)) {
                setConnectionFile(path)
            }
        }
    }), [])

    const onContextMenu = (file: URI, dir: boolean) => {
        const { path } = parseURI(file)
        setMenu(dir ? 
            dirMenu(path, selected, path == appSettings.connections) : 
            fileMenu(path, selected, () => connect(path))
        )
    }

    return <>
        <Explorer 
            icon='cloud_upload'
            connection={LocalFileSystemID}
            settings={settings}
            path={path} 
            fixedRoot={appSettings.connections}
            onChange={onChange} 
            onSelect={(paths: Path[]) => {setSelected(paths); onSelect(paths)}}
            onOpen={connect}
            onMenu={onContextMenu}
            contextMenu={menu}
            toolbar={toolbar}
            tabindex={tabindex}
            onNewFile={uri => setConnectionFile(parseURI(uri).path)}
            onFocus={onFocus}
            onBlur={onBlur}
        /> 
        <ConnectionForm file={connectionFile} onConnect={connect} onClose={() => setConnectionFile('')} />
    </>
}