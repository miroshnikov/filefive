import React, { useState, useEffect, useContext, useMemo } from "react"
import Split from '../Split/Split'
import Explorer from '../Explorer/Explorer'
import Connections from '../Connections'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { ConnectionID, LocalFileSystemID, URI, Path } from '../../../../src/types'
import { createURI } from '../../../../src/utils/URI'
import { ConfigContext } from '../../context/config'
import { Spinner, MenuItem } from '../../ui/components'
import localFileMenu from '../../menu/localFile'
import localDirMenu from '../../menu/localDir'


export default function () {
    const config = useContext(ConfigContext)

    const [connectionId, setConnectionId] = useState<ConnectionID|null>(null)
    const [localPath, setLocalPath] = useState(config.paths.home)
    const [remotePath, setRemotePath] = useState(config.paths.connections)
    const [localSelected, setLocalSelected] = useState<Path[]>([])
    const [remoteSelected, setRemoteSelected] = useState<Path[]>([])
    const [showConnections, setShowConnections] = useState(true)
    const [menu, setMenu] = useState<MenuItem[]>([])
 
    useEffect(() => {
        window.document.body.setAttribute('theme', 'one-dark')
    }, [])

    const openLocal = (path: string) => {
        window.f5.copy(
            [LocalFileSystemID + path] as URI[], 
            (connectionId ?? LocalFileSystemID) + remotePath as URI
        )
    }

    const openRemote = (path: string) => {
        window.f5.copy(
            [(connectionId ?? LocalFileSystemID) + path] as URI[], 
            LocalFileSystemID + localPath as URI
        )  
    }

    const connect = (path: string) => {
        window.f5.connect(path).then(connection => {
            if (connection) {
                const {id, config: { pwd }} = connection
                localStorage.setItem(id, path)
                setShowConnections(false)
                setConnectionId(id)
                setRemotePath(pwd)
            }
        })
    }

    const localToolbar = useMemo<ToolbarItem[]>(() => [
        {
            id: 'Copy',
            icon: connectionId ? 'upload' : 'file_copy',
            disabled: !localSelected.length,
            onClick: () => window.f5.copy(
                localSelected.map(path => LocalFileSystemID + path) as URI[], 
                (connectionId ?? LocalFileSystemID) + remotePath as URI
            )
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !localSelected.length,
            onClick: () => window.f5.remove(localSelected.map(path => createURI(LocalFileSystemID, path)), false)
        }
    ], [localSelected, remotePath])

    const remoteToolbar = useMemo<ToolbarItem[]>(() => [
        {
            id: 'Copy',
            icon: connectionId ? 'download' : 'file_copy',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => (connectionId ?? LocalFileSystemID) + path) as URI[], 
                createURI(LocalFileSystemID, localPath)
            )
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.remove(remoteSelected.map(path => createURI(connectionId ?? LocalFileSystemID, path)), false)
        },
        ...(connectionId ? [
            {
                id: 'Refresh',
                icon: 'refresh',
                disabled: false,
                onClick: () => window.f5.refresh(remotePath as URI)
            },
            {
                id: 'Disconnect',
                icon: 'close',
                disabled: false,
                onClick: () => { 
                    window.f5.disconnect(connectionId); 
                    setConnectionId(null); 
                    setShowConnections(true)
                    setRemotePath(config.paths.connections)
                }
            }
        ] : [])
    ], [remoteSelected, localPath, connectionId])

    const connectionsToolbar = useMemo<ToolbarItem[]>(() => [
        {
            id: 'Connect',
            icon: 'power_settings_new',
            disabled: false,
            onClick: () => { 
                console.log('connect focused')
            }
        },
        ...remoteToolbar,
        {
            id: 'Close',
            icon: 'close',
            disabled: false,
            onClick: () => { 
                setShowConnections(false)
                setRemotePath(config.paths.home)
            }
        }
    ], [remoteToolbar]);

    const fileContextMenu = (file: URI, dir: boolean) => {
        const {protocol, pathname} = new URL(file)
        if (protocol == 'file:') {
            setMenu(dir ? localDirMenu(pathname, localSelected) : localFileMenu(pathname, localSelected))
        } else {
            setMenu([])
        }
    }

    return (<>
        <Split 
            left = {
                localPath ? 
                    <Explorer 
                        icon='computer'
                        connection={LocalFileSystemID}
                        path={localPath} 
                        fixedRoot={'/'}
                        onChange={setLocalPath} 
                        onSelect={paths => setLocalSelected(paths)}
                        onOpen={openLocal}
                        onMenu={fileContextMenu}
                        contextMenu={menu}
                        toolbar={localToolbar}
                        tabindex={1}
                    /> : 
                    <div className="fill-center">
                        <Spinner radius="2em" />
                    </div>
            }
            right = {
                showConnections ? 
                    <Connections
                        path={remotePath} 
                        onChange={setRemotePath} 
                        onSelect={paths => setRemoteSelected(paths)}
                        connect={connect}
                        tabindex={2}
                    /> : 
                    connectionId ? 
                        <Explorer
                            icon='cloud'
                            connection={connectionId}
                            path={remotePath}
                            fixedRoot={'/'}
                            onChange={setRemotePath} 
                            onSelect={paths => setRemoteSelected(paths)}
                            onOpen={openRemote}
                            onMenu={fileContextMenu}
                            toolbar={remoteToolbar}
                            tabindex={2}
                        /> :
                        <Explorer 
                            icon='computer'
                            connection={LocalFileSystemID}
                            path={remotePath} 
                            fixedRoot={'/'}
                            onChange={setRemotePath} 
                            onSelect={paths => setRemoteSelected(paths)}
                            onOpen={openRemote}
                            onMenu={fileContextMenu}
                            toolbar={remoteToolbar}
                            tabindex={2}
                        />
            }
        />
    </>)
}


