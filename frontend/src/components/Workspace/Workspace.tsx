import React, { useState, useEffect, useContext, useMemo } from "react"
import Split from '../Split/Split'
import Explorer from '../Explorer/Explorer'
import Connections from '../Connections'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { ConnectionID, LocalFileSystemID, URI, Path, AppSettings, ConnectionSettings } from '../../../../src/types'
import { createURI, parseURI } from '../../utils/URI'
import { AppSettingsContext } from '../../context/config'
import { Spinner, MenuItem } from '../../ui/components'
import localFileMenu from '../../menu/localFile'
import localDirMenu from '../../menu/localDir'
import { assocPath } from 'ramda'


interface Props {
    onChange: (
        connectionId: ConnectionID|null,
        connectionName: string,
        localPath: Path,
        remotePath: Path
    ) => void
}

export default function Workspace({onChange}: Props) {
    const appSettings = useContext(AppSettingsContext)

    const [connectionId, setConnectionId] = useState<ConnectionID|null>(null)
    const [connectionSettings, setConnectionSettings] = useState<ConnectionSettings & {path: string}>(null)
    const [localPath, setLocalPath] = useState(appSettings.home)
    const [remotePath, setRemotePath] = useState(appSettings.connections)
    const [localSelected, setLocalSelected] = useState<Path[]>([])
    const [remoteSelected, setRemoteSelected] = useState<Path[]>([])
    const [showConnections, setShowConnections] = useState(true)
    const [menu, setMenu] = useState<MenuItem[]>([])
 
    useEffect(() => {
        window.document.body.setAttribute('theme', 'one-dark')
    }, [])

    useEffect(
        () => onChange(connectionId, connectionSettings?.name, localPath, remotePath), 
        [connectionId, connectionSettings, localPath, remotePath]
    )
    
    useEffect(() => {
        if (connectionSettings) {
            window.f5.write(
                createURI(LocalFileSystemID, connectionSettings.path), 
                JSON.stringify(connectionSettings)
            )
        }
    }, [connectionSettings])

    const updateSettings = (settings: Pick<AppSettings, 'layout'>) => {
        window.f5.write(
            createURI(LocalFileSystemID, appSettings.settings),
            JSON.stringify(settings)
        )
    }

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
                const {id, settings} = connection
                setShowConnections(false)
                setConnectionId(id)
                setLocalPath(path => settings.paths.local ?? path)
                setRemotePath(settings.paths.remote!)
                setConnectionSettings({ ...settings, path })
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
                onClick: () => window.f5.refresh(createURI(connectionId, remotePath))
            },
            {
                id: 'Disconnect',
                icon: 'close',
                disabled: false,
                onClick: () => { 
                    window.f5.disconnect(connectionId); 
                    setConnectionId(null)
                    setConnectionSettings(null)
                    setShowConnections(true)
                    setRemotePath(appSettings.connections)
                }
            }
        ] : [])
    ], [remoteSelected, localPath, connectionId])

    const connectionsToolbar = useMemo<ToolbarItem[]>(() => [
        {
            id: 'Connect',
            icon: 'power_settings_new',
            disabled: remoteSelected.length != 1,
            onClick: () => connect(remoteSelected[0])
        },
        ...remoteToolbar,
        {
            id: 'Close',
            icon: 'close',
            disabled: false,
            onClick: () => {
                setShowConnections(false)
                setRemotePath(appSettings.home)
            }
        }
    ], [remoteToolbar]);

    const fileContextMenu = (remote = true) => (file: URI, dir: boolean) => {
        const {id, path} = parseURI(file)
        if (id == LocalFileSystemID) {
            setMenu(dir ? 
                localDirMenu(path, remote ? remoteSelected : localSelected) : 
                localFileMenu(path, remote ? remoteSelected : localSelected)
            )
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
                        settings={connectionSettings?.layout.local ?? appSettings.layout.local}
                        path={localPath} 
                        fixedRoot={'/'}
                        onChange={setLocalPath} 
                        onSelect={paths => setLocalSelected(paths)}
                        onOpen={openLocal}
                        onMenu={fileContextMenu(false)}
                        onSettingsChange={changed => 
                            connectionId ?
                                setConnectionSettings(settings => assocPath(['layout', 'local'], {...settings.layout.local, ...changed}, settings)):
                                updateSettings(assocPath(['layout', 'local'], {...appSettings.layout.remote, ...changed}, appSettings))
                        }
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
                        toolbar={connectionsToolbar}
                        tabindex={2}
                    /> : 
                    connectionId ? 
                        <Explorer
                            icon='cloud'
                            connection={connectionId}
                            settings={connectionSettings.layout.remote}
                            path={remotePath}
                            fixedRoot={'/'}
                            onChange={setRemotePath} 
                            onSelect={paths => setRemoteSelected(paths)}
                            onOpen={openRemote}
                            onMenu={fileContextMenu()}
                            onSettingsChange={changed =>
                                setConnectionSettings(settings => assocPath(['layout', 'remote'], {...settings.layout.remote, ...changed}, settings))
                            }
                            contextMenu={menu}
                            toolbar={remoteToolbar}
                            tabindex={2}
                        /> :
                        <Explorer 
                            icon='computer'
                            connection={LocalFileSystemID}
                            settings={appSettings.layout.remote}
                            path={remotePath} 
                            fixedRoot={'/'}
                            onChange={setRemotePath} 
                            onSelect={paths => setRemoteSelected(paths)}
                            onOpen={openRemote}
                            onMenu={fileContextMenu()}
                            onSettingsChange={changed => 
                                updateSettings(assocPath(['layout', 'remote'], {...appSettings.layout.remote, ...changed}, appSettings))
                            }
                            contextMenu={menu}
                            toolbar={remoteToolbar}
                            tabindex={2}
                        />
            }
        />
    </>)
}


