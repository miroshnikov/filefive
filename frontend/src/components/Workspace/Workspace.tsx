import React, { useState, useEffect, useContext, useRef } from "react"
import Split from '../Split/Split'
import Explorer from '../Explorer/Explorer'
import Connections from '../Connections'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { ConnectionID, LocalFileSystemID, URI, Path, AppSettings, ConnectionSettings } from '../../../../src/types'
import { createURI, parseURI } from '../../../../src/utils/URI'
import { AppSettingsContext } from '../../context/config'
import { Spinner, MenuItem } from '../../ui/components'
import localFileMenu from '../../menu/localFile'
import remoteFileMenu from '../../menu/remoteFile'
import localDirMenu from '../../menu/localDir'
import remoteDirMenu from '../../menu/remoteDir'
import { useEffectOnUpdate, useSubscribe } from '../../hooks'
import { assocPath, mergeDeepRight } from 'ramda'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'


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

    const [connection, setConnection] = 
        useState<ConnectionSettings & {id: ConnectionID, file: string}>(null)
    const [localPath, setLocalPath] = useState(appSettings.path?.local ?? appSettings.home)
    const [remotePath, setRemotePath] = useState(appSettings.connections)
    const [localSelected, setLocalSelected] = useState<Path[]>([])
    const [remoteSelected, setRemoteSelected] = useState<Path[]>([])
    const [showConnections, setShowConnections] = useState(true)
    const [menu, setMenu] = useState<MenuItem[]>([])

    const focused = useRef<'local'|'remote'|null>(null)
 
    useEffect(() => {
        window.document.body.setAttribute('theme', 'one-dark')
    }, [])

    useEffect(
        () => onChange(connection?.id, connection?.name, localPath, remotePath), 
        [connection?.id, connection, localPath, remotePath]
    )
    
    useEffectOnUpdate(() => {
        if (connection) {
            window.f5.save(
                connection.file, 
                { 
                    ...connection,
                    path: { 
                        local: localPath, 
                        remote: showConnections ? connection.path.remote : remotePath 
                    }
                }
            )
        }
    }, [connection, remotePath, localPath])

    const updateSettings = (settings: Pick<AppSettings, 'layout'>) => {
        window.f5.write(
            createURI(LocalFileSystemID, appSettings.settings),
            JSON.stringify(settings)
        )
    }

    useEffectOnUpdate(() => {
        if (!connection) {
            window.f5.write(
                createURI(LocalFileSystemID, appSettings.settings),
                JSON.stringify(
                    mergeDeepRight(
                        appSettings, {
                            path: { 
                                local: localPath, 
                                remote: showConnections ? (appSettings.path?.remote ?? appSettings.home) : remotePath 
                            }
                        }
                    )
                )
            )
        }
    }, [remotePath, localPath])

    const openLocal = (path: string) => {
        window.f5.copy(
            [LocalFileSystemID + path] as URI[], 
            (connection?.id ?? LocalFileSystemID) + remotePath as URI
        )
    }

    const openRemote = (path: string) => {
        window.f5.copy(
            [(connection?.id ?? LocalFileSystemID) + path] as URI[], 
            LocalFileSystemID + localPath as URI
        )  
    }

    const connect = (path: string) => {
        window.f5.connect(path).then(connection => {
            if (connection) {
                setShowConnections(false)
                const {id, settings} = connection
                setConnection({ ...settings, id, file: path })
                setLocalPath(path => settings.path.local ?? path)
                setRemotePath(settings.path.remote!)
            }
        })
    }

    const localToolbar: ToolbarItem[] = [
        {
            id: 'Copy',
            icon: connection ? 'upload' : 'file_copy',
            disabled: focused.current != 'local' || !localSelected.length,
            onClick: () => window.f5.copy(
                localSelected.map(path => createURI(LocalFileSystemID, path)), 
                createURI(connection?.id ?? LocalFileSystemID, remotePath)
            )
        },
        {
            id: 'New Folder...',
            icon: 'create_new_folder',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: 'New File...',
            icon: 'note_add',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !localSelected.length,
            onClick: () => command$.next({id: CommandID.Delete})
        }
    ]

    const remoteToolbar: ToolbarItem[] = [
        {
            id: 'Copy',
            icon: connection ? 'download' : 'file_copy',
            disabled: focused.current != 'remote' || !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => createURI(connection?.id ?? LocalFileSystemID, path)), 
                createURI(LocalFileSystemID, localPath)
            )
        },
        {
            id: 'New Folder...',
            icon: 'create_new_folder',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: 'New File...',
            icon: 'note_add',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !remoteSelected.length,
            onClick: () => command$.next({id: CommandID.Delete})
        },
        ...(connection ? [
            {
                id: 'Refresh',
                icon: 'refresh',
                disabled: false,
                onClick: () => window.f5.refresh(createURI(connection.id, remotePath))
            },
            {
                id: 'Disconnect',
                icon: 'close',
                disabled: false,
                onClick: () => { 
                    window.f5.disconnect(connection.id); 
                    setConnection(null)
                    setLocalPath(appSettings.path?.local ?? appSettings.home)
                    setRemotePath(appSettings.connections)
                    setShowConnections(true)
                }
            }
        ] : [])
    ]

    const connectionsToolbar: ToolbarItem[] = [
        {
            id: 'Connect',
            icon: 'power_settings_new',
            disabled: remoteSelected.length != 1,
            onClick: () => connect(remoteSelected[0])
        },
        {
            id: 'New Folder...',
            icon: 'create_new_folder',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: 'New File...',
            icon: 'note_add',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: 'Copy',
            icon: 'file_copy',
            disabled: focused.current != 'remote' || !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => createURI(LocalFileSystemID, path)), 
                createURI(LocalFileSystemID, localPath)
            )
        },
        {
            id: 'Delete',
            icon: 'delete',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.remove(remoteSelected.map(path => createURI(connection?.id ?? LocalFileSystemID, path)), false)
        },
        {
            id: 'Close',
            icon: 'close',
            disabled: false,
            onClick: () => {
                setShowConnections(false)
                setRemotePath( 
                    connection ? 
                        (connection.path?.remote ?? connection.pwd) : 
                        (appSettings.path?.remote ?? appSettings.home) 
                    )
            }
        }
    ]

    const fileContextMenu = (remote = true) => (file: URI, dir: boolean) => {
        const {id, path} = parseURI(file)
        if (id == LocalFileSystemID) {
            const copyTo = remote ? createURI(LocalFileSystemID, localPath) : createURI(connection?.id ?? LocalFileSystemID, remotePath)
            setMenu(dir ? 
                localDirMenu(path, remote ? remoteSelected : localSelected, copyTo, path == localPath) : 
                localFileMenu(path, remote ? remoteSelected : localSelected, copyTo)
            )
        } else {
            setMenu(dir ? 
                remoteDirMenu(id, path, remoteSelected, localPath) : 
                remoteFileMenu(id, path, remoteSelected, localPath)
            )
        }
    }

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Connections: {
                    setShowConnections(true)
                    setRemotePath(appSettings.connections)
                    break
                }
                case CommandID.Refresh: {
                    if (connection) {
                        window.f5.refresh(createURI(connection.id, remotePath))
                    }
                    break
                }
                case CommandID.Copy: {
                    if (focused.current) {
                        focused.current == 'local' ?
                            window.f5.copy(
                                localSelected.map(path => createURI(LocalFileSystemID, path)), 
                                createURI(connection?.id ?? LocalFileSystemID, remotePath)
                            ) :
                            window.f5.copy(
                                remoteSelected.map(path => createURI(showConnections ? LocalFileSystemID : connection?.id ?? LocalFileSystemID, path)), 
                                createURI(LocalFileSystemID, localPath)
                            )
                    }
                    break
                }
                case CommandID.Delete: {
                    if (focused.current) {
                        focused.current == 'local' ?
                            window.f5.remove(localSelected.map(path => createURI(LocalFileSystemID, path)), false) : (
                                showConnections ? 
                                    window.f5.remove(remoteSelected.map(path => createURI(LocalFileSystemID, path)), false) : 
                                    window.f5.remove(remoteSelected.map(path => createURI(connection?.id ?? LocalFileSystemID, path)), false)
                            )
                    }
                }
            }
        }),
        [appSettings, connection, localSelected, remoteSelected]
    )

    return (<>
        <Split 
            left = {
                localPath ? 
                    <Explorer 
                        icon='computer'
                        connection={LocalFileSystemID}
                        settings={connection?.layout.local ?? appSettings.layout.local}
                        path={localPath} 
                        fixedRoot={'/'}
                        onChange={setLocalPath} 
                        onSelect={paths => setLocalSelected(paths)}
                        onOpen={openLocal}
                        onMenu={fileContextMenu(false)}
                        onSettingsChange={changed => 
                            connection ?
                                setConnection(connection => assocPath(['layout', 'local'], {...connection.layout.local, ...changed}, connection)):
                                updateSettings(assocPath(['layout', 'local'], {...appSettings.layout.remote, ...changed}, appSettings))
                        }
                        contextMenu={menu}
                        toolbar={localToolbar}
                        tabindex={1}
                        onFocus={() => focused.current = 'local'}
                        onBlur={() => focused.current = null}
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
                        onFocus={() => focused.current = 'remote'}
                        onBlur={() => focused.current = null}
                    /> : 
                    connection ? 
                        <Explorer
                            icon='cloud'
                            connection={connection.id}
                            settings={connection.layout.remote}
                            path={remotePath}
                            fixedRoot={'/'}
                            onChange={setRemotePath} 
                            onSelect={paths => setRemoteSelected(paths)}
                            onOpen={openRemote}
                            onMenu={fileContextMenu()}
                            onSettingsChange={changed =>
                                setConnection(connection => assocPath(['layout', 'remote'], {...connection.layout.remote, ...changed}, connection))
                            }
                            contextMenu={menu}
                            toolbar={remoteToolbar}
                            tabindex={2}
                            onFocus={() => focused.current = 'remote'}
                            onBlur={() => focused.current = null}
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
                            onFocus={() => focused.current = 'remote'}
                            onBlur={() => focused.current = null}
                        />
            }
        />
    </>)
}


