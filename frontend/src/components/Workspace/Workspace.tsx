import React, { useState, useEffect, useContext, useRef } from "react"
import Split from '../Split/Split'
import Explorer from '../Explorer/Explorer'
import Connections from '../Connections'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { ConnectionID, LocalFileSystemID, URI, Path, AppSettings, ConnectionSettings, FailureType } from '../../../../src/types'
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
import { error$ } from '../../observables/error'
import { basename, dirname } from '../../utils/path'


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
    const [connecting, setConnecting] = useState('')

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
            console.log('save conn')
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
        setConnecting(basename(path))
        window.f5.connect(path)
            .then(connection => {
                if (connection) {
                    setShowConnections(false)
                    const {id, settings} = connection
                    setConnection({ ...settings, id, file: path })
                    setLocalPath(path => settings.path.local ?? path)
                    setRemotePath(settings.path.remote!)
                }
            })
            .catch(e => {})
            .finally(() => setConnecting(''))
    }

    const disconnect = () => {
        if (!connection) {
            return
        }
        window.f5.disconnect(connection.id)
        setConnection(null)
        setLocalPath(appSettings.path?.local ?? appSettings.home)
        setRemotePath(appSettings.connections)
        setShowConnections(true)
    }

    const localToolbar: ToolbarItem[] = [
        {
            id: CommandID.Transfer,
            icon: connection ? 'upload' : 'file_copy',
            title: connection ? 'Upload Selected' : 'Copy Selected',
            disabled: focused.current != 'local' || !localSelected.length,
            onClick: () => window.f5.copy(
                localSelected.map(path => createURI(LocalFileSystemID, path)), 
                createURI(connection?.id ?? LocalFileSystemID, remotePath)
            )
        },
        {
            id: CommandID.NewDir,
            icon: 'create_new_folder',
            title: 'New Folder...',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: CommandID.NewFile,
            icon: 'note_add',
            title: 'New File...',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: CommandID.CollapseAll,
            icon: 'unfold_less',
            title: 'Collapse All Folders',
            onClick: () => command$.next({id: CommandID.CollapseAll})
        },
        {
            id: CommandID.Delete,
            icon: 'delete',
            title: 'Delete Selected',
            disabled: !localSelected.length,
            onClick: () => command$.next({id: CommandID.Delete})
        }
    ]

    const remoteToolbar: ToolbarItem[] = [
        {
            id: CommandID.Transfer,
            icon: connection ? 'download' : 'file_copy',
            title: connection ? 'Download Selected' : 'Copy Selected',
            disabled: focused.current != 'remote' || !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => createURI(connection?.id ?? LocalFileSystemID, path)), 
                createURI(LocalFileSystemID, localPath)
            )
        },
        {
            id: CommandID.NewDir,
            icon: 'create_new_folder',
            title: 'New Folder...',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: CommandID.NewFile,
            icon: 'note_add',
            title: 'New File...',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: CommandID.CollapseAll,
            icon: 'unfold_less',
            title: 'Collapse All Folders',
            onClick: () => command$.next({id: CommandID.CollapseAll})
        },
        {
            id: CommandID.Delete,
            icon: 'delete',
            title: 'Delete',
            disabled: !remoteSelected.length,
            onClick: () => command$.next({id: CommandID.Delete})
        },
        ...(connection ? [
            {
                id: CommandID.Refresh,
                icon: 'refresh',
                title: 'Refresh',
                disabled: false,
                onClick: () => window.f5.refresh(createURI(connection.id, remotePath))
            },
            {
                id: 'disconnect',
                icon: 'close',
                title: 'Disconnect',
                disabled: false,
                onClick: () => disconnect()
            }
        ] : [])
    ]

    const connectionsToolbar: ToolbarItem[] = [
        {
            id: 'connect',
            icon: 'power_settings_new',
            title: 'Connect',
            disabled: remoteSelected.length != 1,
            onClick: () => connect(remoteSelected[0])
        },
        {
            id: CommandID.NewDir,
            icon: 'create_new_folder',
            title: 'New Folder...',
            onClick: () => command$.next({id: CommandID.NewDir})
        },
        {
            id: CommandID.NewFile,
            icon: 'note_add',
            title: 'New File...',
            onClick: () => command$.next({id: CommandID.NewFile})
        },
        {
            id: CommandID.Transfer,
            icon: 'file_copy',
            title: 'Copy Selected',
            disabled: focused.current != 'remote' || !remoteSelected.length,
            onClick: () => window.f5.copy(
                remoteSelected.map(path => createURI(LocalFileSystemID, path)), 
                createURI(LocalFileSystemID, localPath)
            )
        },
        {
            id: CommandID.CollapseAll,
            icon: 'unfold_less',
            title: 'Collapse All Folders',
            onClick: () => command$.next({id: CommandID.CollapseAll})
        },
        {
            id: CommandID.Delete,
            icon: 'delete',
            title: 'Delete Selected',
            disabled: !remoteSelected.length,
            onClick: () => window.f5.remove(remoteSelected.map(path => createURI(connection?.id ?? LocalFileSystemID, path)), false)
        },
        {
            id: 'Close',
            icon: 'close',
            title: 'Close Connections',
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
                localDirMenu(path, remote ? remoteSelected : localSelected, copyTo, path == (remote ? remotePath : localPath)) : 
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
                case CommandID.Transfer: {
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

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.MissingDir) {
                const {id, path} = parseURI(error.uri)
                if (id == LocalFileSystemID) {
                    if (path == localPath) {
                        setLocalPath(dirname(localPath))
                    }
                    if (!connection && path == remotePath) {
                        setRemotePath(dirname(remotePath))
                    }
                } else if (id == connection.id && path == remotePath) {
                    setRemotePath(dirname(remotePath))
                }
            }
        }),
        [connection, localPath, remotePath]
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
                connecting.length ? 
                    <div className="fill-center">
                        <div className="center">
                            <Spinner radius="2em" />
                            <p>Connecting {connecting}...</p>
                        </div>
                    </div> :
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


