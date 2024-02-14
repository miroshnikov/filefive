import React, { useState, useEffect, useContext, useMemo } from "react"
import Split from '../Split/Split'
import { Spinner } from '../../ui'
import Explorer from '../Explorer/Explorer'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { useEvent } from '../../hooks'
import { ConnectionID, LocalFileSystemID, URI } from '../../../../src/types'
import { ConfigContext } from '../../context/config'
import { MenuItem } from '../../ui'
import localFile from '../../menus/localFile'
import localDir from '../../menus/localDir'


export default function () {
    const config = useContext(ConfigContext)

    const [connectionId, setConnectionId] = useState<ConnectionID|null>(null)
    const [localPath, setLocalPath] = useState(config.paths.home)
    const [remotePath, setRemotePath] = useState(config.paths.connections)
    const [localSelected, setLocalSelected] = useState<string[]>([])
    const [remoteSelected, setRemoteSelected] = useState<string[]>([])
    const [showConnections, setShowConnections] = useState(true)
    const [menu, setMenu] = useState<MenuItem[]>([])

    useEffect(() => {
        window.document.body.setAttribute('theme', 'one-dark')
        const size = localStorage.getItem('window_size')
        if (size) {
            const {width, height} = JSON.parse(size)
            window.resizeTo(width, height)
        }
    }, [])

    useEvent(window, 'resize', () => {
        localStorage.setItem('window_size', JSON.stringify({width: window.outerWidth, height: window.outerHeight}))
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
        window.f5.connect(path).then(({id, config: { pwd }}) => {
            localStorage.setItem(id, path)
            setShowConnections(false)
            setConnectionId(id)
            setRemotePath(pwd)
        })
    }

    useEffect(() => {
        console.log('set remote', remotePath)
    }, [remotePath])

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
            onClick: () => window.f5.remove(localSelected.map(path => LocalFileSystemID + path) as URI[])
        }
    ], [localSelected, remotePath])

    const remoteToolbar = useMemo<ToolbarItem[]>(() => [
        {
            id: 'Copy',
            icon: connectionId ? 'download' : 'file_copy',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => (connectionId ?? LocalFileSystemID) + path) as URI[], 
                LocalFileSystemID + localPath as URI
            )
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.remove(remoteSelected.map(path => (connectionId ?? LocalFileSystemID) + path) as URI[])
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
            setMenu(dir ? localDir(pathname, localSelected as URI[]) : localFile(pathname, localSelected as URI[]))
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
                    <Explorer 
                        icon='power_settings_new'
                        connection={LocalFileSystemID}
                        path={remotePath} 
                        fixedRoot={config.paths.connections}
                        onChange={setRemotePath} 
                        onSelect={paths => setRemoteSelected(paths)}
                        onOpen={connect}
                        onMenu={fileContextMenu}
                        toolbar={connectionsToolbar}
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


