import React, { useState, useEffect, useContext, useRef } from "react"
import { Split } from '../../ui/components'
import Explorer from '../Explorer/Explorer'
import Connections from '../Connections'
import { ToolbarItem } from '../Toolbar/Toolbar'
import { ConnectionID, LocalFileSystemID, URI, Path, AppSettings, ConnectionSettings, FailureType, DeepPartial, QueueEventType } from '../../../../src/types'
import { createURI, isLocal, parseURI } from '../../../../src/utils/URI'
import { AppSettingsContext } from '../../context/config'
import { Spinner, MenuItem, Button, Tooltips } from '../../ui/components'
import localFileMenu from '../../menu/localFile'
import remoteFileMenu from '../../menu/remoteFile'
import localDirMenu from '../../menu/localDir'
import remoteDirMenu from '../../menu/remoteDir'
import { useEffectOnUpdate, useSubscribe, useConcatAsyncEffect } from '../../hooks'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'
import { error$ } from '../../observables/error'
import { basename, dirname, join, descendantOf } from '../../utils/path'
import classNames from 'classnames'
import MissingDir from './MissingDir'
import styles from './Workspace.less'
import { createQueue } from '../../observables/queue'


export type AppSettingsChanges = DeepPartial<Pick<AppSettings, 'local'|'remote'|'path'|'sync'>>

interface Props {
    onChange: (
        connectionId: ConnectionID|null,
        connectionName: string,
        localPath: Path,
        remotePath: Path
    ) => void
    onSettingsChange: (settings: AppSettingsChanges) => void
}

export default function Workspace({onChange, onSettingsChange}: Props) {
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
    const abortConnecting = useRef<AbortController>(null)
    const sid = useRef<string>(null)
    const [sync, setSync] = useState(false)
    const [syncRootLocal, setSyncRootLocal] = useState<string>(null)
    const [syncRootRemote, setSyncRootRemote] = useState<string>(null)
    const [tryDir, setTryDir] = useState('')
    const [missingTarget, setMissingTarget] = useState<'local'|'remote'>(null)

    const focused = useRef<'local'|'remote'|null>(null)

    useEffect(
        () => onChange(connection?.id, connection?.name, localPath, remotePath), 
        [connection?.id, connection, localPath, remotePath]
    )

    useEffect(() => {
        sessionStorage.removeItem('Connecting')

        const u = new URL(window.location.toString())
        if (u.searchParams.has('connect') && !connecting) {
            connect(u.searchParams.get('connect'))
        }
    }, [])

    useConcatAsyncEffect(async () => {
        if (connection) {
            await window.f5.save(
                connection.file, { 
                    ...connection,
                    path: { 
                        local: localPath, 
                        remote: showConnections ? connection.path.remote : remotePath 
                    }
                }
            )
        }
    }, [connection, remotePath, localPath])

    useEffectOnUpdate(() => {
        if (!connection) {
            onSettingsChange({
                path: { 
                    local: localPath, 
                    remote: showConnections ? (appSettings.path?.remote ?? appSettings.home) : remotePath 
                }
            })
        }
    }, [remotePath, localPath])

    const openLocal = (path: string) => {
        command$.next({ id: CommandID.Transfer, uri: createURI(LocalFileSystemID, path) })
    }

    const openRemote = (path: string) => {
        command$.next({ id: CommandID.Transfer, uri: createURI(connection?.id ?? LocalFileSystemID, path) })
    }

    const connect = (path: string) => {
        disconnect()

        setConnecting(basename(path))
        sessionStorage.setItem('Connecting', path);

        abortConnecting.current = new AbortController()

        window.f5.connect(path, abortConnecting.current.signal)
            .then(connection => {
                if (connection) {
                    setShowConnections(false)
                    const {id, settings} = connection
                    setConnection({ ...settings, id, file: path })
                    sid.current = connection.sid
                    setLocalPath(path => settings.path.local ?? path)
                    setRemotePath(settings.path.remote!)
                    const u = new URL(window.location.toString())
                    u.searchParams.set('connect', path)
                    history.replaceState(null, '', u.toString())
                }
            })
            .catch(e => {})
            .finally(() => { 
                setConnecting(''); 
                sessionStorage.removeItem('Connecting') 
            })
    }

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', connection ? connection.theme : appSettings.theme)

        const syncDirs = connection ? connection.sync : appSettings.sync
        setSyncRootLocal(syncDirs?.local ?? null)
        setSyncRootRemote(syncDirs?.remote ?? null)
        setSync(!!syncDirs)
    }, [appSettings, connection])
  
    const disconnect = () => {
        setSync(false)
        if (!connection) {
            return
        }
        abortConnecting.current = sid.current = undefined
        window.f5.disconnect(connection.id, sid.current)
        setConnection(null)
        setLocalPath(appSettings.path?.local ?? appSettings.home)
        setRemotePath(appSettings.connections)
        const u = new URL(window.location.toString())
        u.searchParams.delete('connect')
        history.replaceState(null, '', u.toString())
        setShowConnections(true)
    }

    const cancel = () => {
        if (connection) {
            return
        }
        abortConnecting.current?.abort()
        abortConnecting.current = null
        const u = new URL(window.location.toString())
        u.searchParams.delete('connect')
        history.replaceState(null, '', u.toString())
        setConnecting('')
    }

    const toolbar: ToolbarItem[] = [
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
            id: CommandID.ShowFilter,
            icon: 'filter_alt',
            title: 'Filter...',
            onClick: () => command$.next({id: CommandID.ShowFilter})
        },
        {
            id: CommandID.SelectAll,
            icon: 'select_all',
            title: 'Select All',
            onClick: () => command$.next({id: CommandID.SelectAll})
        },
        {
            id: CommandID.SelectAllFiles,
            icon: 'select',
            title: 'Select All Files',
            onClick: () => command$.next({id: CommandID.SelectAllFiles})
        },
        {
            id: CommandID.CollapseAll,
            icon: 'unfold_less',
            title: 'Collapse All Folders',
            onClick: () => command$.next({id: CommandID.CollapseAll})
        }
    ]

    const localToolbar: ToolbarItem[] = [
        {
            id: CommandID.Transfer,
            icon: connection ? 'upload' : 'file_copy',
            title: connection ? 'Upload Selected' : 'Copy Selected',
            disabled: !localSelected.length,
            onClick: () => command$.next({id: CommandID.Transfer})
        },
        {
            id: 'transfer_keep_paths',
            icon: connection ? 'upload_2' : 'folder_copy',
            title: (connection ? 'Upload Selected' : 'Copy Selected') + ' Keep Relative Paths',
            disabled: !localSelected.length,
            onClick: () => command$.next({ id: CommandID.Transfer, root: localPath })
        },

        ...toolbar,
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
            disabled: !remoteSelected.length,
            onClick: () => command$.next({id: CommandID.Transfer})
        },
        {
            id: 'transfer_keep_paths',
            icon: connection ? 'download_2' : 'folder_copy',
            title: (connection ? 'Download Selected' : 'Copy Selected') + ' Keep Relative Paths',
            disabled: !remoteSelected.length,
            onClick: () => command$.next({ id: CommandID.Transfer, root: remotePath })
        },
        ...toolbar,
        {
            id: CommandID.Delete,
            icon: 'delete',
            title: 'Delete',
            disabled: !remoteSelected.length,
            onClick: () => command$.next({id: CommandID.Delete})
        },
        ...(connection ? [
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
            title: 'Connect <code>Double-click on File</code>',
            disabled: remoteSelected.length != 1,
            onClick: () => connect(remoteSelected[0])
        },
        ...toolbar,
        {
            id: 'Close',
            icon: 'close',
            title: 'Close Connections',
            disabled: false,
            onClick: () => setShowConnections(false)
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
                remoteDirMenu(id, path, remoteSelected, localPath, path == remotePath) : 
                remoteFileMenu(id, path, remoteSelected, localPath)
            )
        }
    }

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Connections: {
                    setShowConnections(true)
                    break
                }
                case CommandID.Transfer: {
                    if (focused.current) {
                        let local = focused.current == 'local'
                        let files = local ? localSelected : remoteSelected
                        if (cmd.uri) {
                            local = isLocal(cmd.uri)
                            const { path } = parseURI(cmd.uri)
                            files = (local ? localSelected : remoteSelected).includes(path) ? 
                                (local ? localSelected : remoteSelected) : 
                                [path]
                        }
                        if (!files.length) {
                            return
                        }

                        const qid = local ?
                            window.f5.copy(
                                files.map(path => createURI(LocalFileSystemID, path)), 
                                connection?.id ? 
                                    createURI(connection.id, remotePath) :
                                    createURI(LocalFileSystemID, focused.current == 'local' ? remotePath : localPath),
                                false,
                                (connection ?? appSettings).local.filter,
                                cmd.root,
                                sid.current
                            ) :
                            window.f5.copy(
                                files.map(path => createURI(showConnections ? LocalFileSystemID : connection?.id ?? LocalFileSystemID, path)), 
                                createURI(LocalFileSystemID, localPath),
                                false,
                                showConnections ? null : (connection ?? appSettings).remote.filter,
                                cmd.root,
                                sid.current
                            )
                        qid.then(id => createQueue(id))
                    }
                    break
                }
                case CommandID.SyncBrowsing: {
                    setSync(sync => !sync)
                    break
                }
            }
        }),
        [appSettings, connection, localSelected, remoteSelected]
    )

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.MissingDir) {
                const {id, path} = parseURI(error.uri)
                if (tryDir === path) {
                    setMissingTarget(path == localPath ? 'local' : 'remote')
                    return
                }
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
        [connection, localPath, remotePath, tryDir]
    )

    useEffectOnUpdate(() => { 
        setSync(false)
        showConnections ? 
            setRemotePath(appSettings.connections) :
            setRemotePath( 
                connection ? 
                    (connection.path?.remote ?? connection.pwd) : 
                    (appSettings.path?.remote ?? appSettings.home) 
                )
    }, [showConnections])   

    useEffectOnUpdate(() => {       
        const localRoot = sync ? (syncRootLocal ?? localPath) : null
        setSyncRootLocal(localRoot)

        const remoteRoot = sync ? (syncRootRemote ?? remotePath) : null
        setSyncRootRemote(remoteRoot)

        if (!sync) {
            setTryDir('')
            setMissingTarget(null)
        }
        connection ?
            setConnection(connection => ({ ...connection, sync: sync ? { local: localRoot, remote: remoteRoot } : null })):
            onSettingsChange({ sync: sync ? { local: localRoot, remote: remoteRoot } : null })
    }, [sync])

    const syncDir = (root: string, dir: string, targetRoot: string, setF: (path: string) => void) => {
        if (!sync) {
            return
        }
        const path = join(targetRoot, dir.substring(root.length))
        setMissingTarget(null)
        setTryDir(path)
        setF(path)
    }

    useEffectOnUpdate(() => {
        if (syncRootLocal && localPath.length < syncRootLocal.length) {
            setSync(false)
        } else if (localPath != tryDir) {
            syncDir(syncRootLocal, localPath, syncRootRemote, setRemotePath)
        }
    }, [localPath])

    useEffectOnUpdate(() => {
        if (syncRootRemote && remotePath.length < syncRootRemote.length) {
            setSync(false)
        } else if (remotePath != tryDir) {
            syncDir(syncRootRemote, remotePath, syncRootLocal, setLocalPath)
        }
    }, [remotePath])

    return (<>
        <Split className={classNames({ sync })}
            left = {
                localPath ? (
                    missingTarget == 'local' ? 
                        <MissingDir 
                            path={localPath}
                            onClose={async (create) => {
                                if (create) {
                                    await window.f5.mkdir(basename(tryDir), createURI(LocalFileSystemID, dirname(tryDir)))
                                    setMissingTarget(null)
                                } else {
                                    setMissingTarget(null)
                                    setSync(false)
                                }
                            }}
                        /> :
                        <Explorer 
                            icon='computer'
                            connection={LocalFileSystemID}
                            settings={(connection ?? appSettings).local}
                            path={localPath} 
                            fixedRoot={syncRootLocal ?? '/'}
                            onChange={setLocalPath} 
                            onSelect={paths => setLocalSelected(paths)}
                            onOpen={openLocal}
                            onMenu={fileContextMenu(false)}
                            onSettingsChange={changes => 
                                connection ?
                                    setConnection(connection => ({...connection, local: {...connection.local, ...changes}})):
                                    onSettingsChange({ local: changes })
                            }
                            contextMenu={menu}
                            toolbar={localToolbar}
                            tabindex={1}
                            onFocus={() => focused.current = 'local'}
                            onBlur={() => focused.current = null}
                        />
                ) : 
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
                            <Button onClick={() => cancel()}>Cancel</Button>
                        </div>
                    </div> : (
                        missingTarget == 'remote' ? 
                            <MissingDir 
                                path={remotePath}
                                onClose={async (create) => {
                                    if (create) {
                                        await window.f5.mkdir(
                                            tryDir.substring(syncRootRemote.length),
                                            createURI(connection?.id ?? LocalFileSystemID, syncRootRemote)
                                        )
                                        setMissingTarget(null)
                                    } else {
                                        setMissingTarget(null)
                                        setSync(false)
                                    }
                                }}
                            /> : (
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
                                            connectionName={basename(connection.file)}
                                            homeDir={connection.pwd}
                                            sid={sid.current}
                                            settings={connection.remote}
                                            path={remotePath}
                                            fixedRoot={syncRootRemote ?? '/'}
                                            onChange={setRemotePath} 
                                            onSelect={paths => setRemoteSelected(paths)}
                                            onOpen={openRemote}
                                            onMenu={fileContextMenu()}
                                            onSettingsChange={changes =>
                                                setConnection(connection => ({...connection, remote: {...connection.remote, ...changes}}))
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
                                            settings={appSettings.remote}
                                            path={remotePath} 
                                            fixedRoot={syncRootRemote ?? '/'}
                                            onChange={setRemotePath} 
                                            onSelect={paths => setRemoteSelected(paths)}
                                            onOpen={openRemote}
                                            onMenu={fileContextMenu()}
                                            onSettingsChange={changes => onSettingsChange({ remote: changes })}
                                            contextMenu={menu}
                                            toolbar={remoteToolbar}
                                            tabindex={2}
                                            onFocus={() => focused.current = 'remote'}
                                            onBlur={() => focused.current = null}
                                        />
                            )
                    )
            }
        >
            <Tooltips shortcuts={appSettings.keybindings}>
                <button 
                    className={classNames(styles.synctoggle, 'icon', { on: sync })} 
                    onClick={() => command$.next({id: CommandID.SyncBrowsing})}
                    data-tooltip={`Synchronized Browsing is ${sync ? 'On' : 'Off'}`}
                    data-command={CommandID.SyncBrowsing}
                >{sync ? 'sync_lock' : 'sync'}</button>
            </Tooltips>
        </Split>
    </>)
}
