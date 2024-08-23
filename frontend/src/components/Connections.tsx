import React, { useState, useContext } from "react"
import { LocalFileSystemID, URI, Path, SortOrder, ExplorerSettings } from '../../../src/types'
import { FileAttributeType } from '../../../src/FileSystem'
import { ConfigContext } from '../context/config'
import { MenuItem } from '../ui/components'
import { parseURI } from '../utils/URI'
import Explorer from './Explorer/Explorer'
import dirMenu from '../menu/connectionsDir'
import fileMenu from '../menu/connection'
import NewConnection from '../modals/Connection/Connection'
import { ToolbarItem } from './Toolbar/Toolbar'


interface Props {
    path: Path
    onChange: (dir: Path) => void
    onSelect: (paths: Path[]) => void
    connect: (path: Path) => void
    toolbar: ToolbarItem[]
    tabindex: number
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
    sort: ['name', SortOrder.Asc]
}

export default function Connections({ path, onChange, onSelect, connect, toolbar, tabindex }: Props) {
    const config = useContext(ConfigContext)
    const [selected, setSelected] = useState<Path[]>([])
    const [menu, setMenu] = useState<MenuItem[]>([])
    const [newConnection, setNewConnection] = useState<Path>('')

    const onContextMenu = (file: URI, dir: boolean) => {
        const { path } = parseURI(file)
        setMenu(dir ? dirMenu(path, selected) : fileMenu(path, selected, () => connect(path)))
    }

    return <>
        <Explorer 
            icon='power_settings_new'
            connection={LocalFileSystemID}
            settings={settings}
            path={path} 
            fixedRoot={config.paths.connections}
            onChange={onChange} 
            onSelect={(paths: Path[]) => {setSelected(paths); onSelect(paths)}}
            onOpen={connect}
            onMenu={onContextMenu}
            contextMenu={menu}
            toolbar={toolbar}
            tabindex={tabindex}
            onNewFile={uri => setNewConnection(parseURI(uri).path)}
        /> 
        <NewConnection file={newConnection} onConnect={connect} onClose={() => setNewConnection('')} />
    </>
}