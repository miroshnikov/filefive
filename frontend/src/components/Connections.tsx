import React, { useState, useContext } from "react"
import { LocalFileSystemID, URI, Path } from '../../../src/types'
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

export default function ({ path, onChange, onSelect, connect, toolbar, tabindex }: Props) {
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