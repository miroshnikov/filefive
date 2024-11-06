import React, { useEffect, useState, useRef } from "react"
import Workspace, { SettingsChanges } from '../Workspace/Workspace'
import styles from './App.less'
import { useMap, useSubscribe, useShortcuts, useMode, useCopyPaste, useConcatAsyncEffect } from '../../hooks'
import { queue$ } from '../../observables/queue'
import Queue from '../Queue/Queue'
import { LocalFileSystemID, QueueEventType, QueueType, ConnectionID, AppSettings, Path } from '../../../../src/types'
import { parse } from '../../utils/path'
import { createURI } from '../../../../src/utils/URI'
import classNames from "classnames"
import QueueAction from "../QueueAction/QueueAction"
import Error from '../Error/Error'
import AskForPassword from '../../modals/Password'
import ConfirmDeletion from '../../modals/Deletion'
import { command$ } from '../../observables/command'
import { file$ } from '../../observables/file'
import { CommandID, KeyShortcutCommand } from '../../commands'
import { AppSettingsContext } from '../../context/config'
import { Tooltips, getTooltipShortcut, Spinner } from '../../ui/components'
import Settings from '../../modals/Settings/Settings'



function setTitle(connectionId: ConnectionID|null, connectionName: string, localPath: Path, remotePath: Path) {
    let title = (connectionName ? connectionName + ' - ' : '') + parse(remotePath).name
    document.querySelector<HTMLElement>('head > title').innerText = title
}


export default function App () {
    const [appSettings, setAppSettings] = useState<AppSettings>(null)

    const settingsFile = useRef('')
    const [settingsChanges, setSettingsChanges] = useState<SettingsChanges>(null)

    
    useEffect(() => { 
        window.f5.settings().then(settings => {
            setAppSettings(settings)
            settingsFile.current = settings.settings
        }) 
    }, [])

    useEffect(() => {
        if (appSettings) {
            window.f5.watch(createURI(LocalFileSystemID, appSettings.settings))
        }
    }, [appSettings])

    const defaultMode = useMode()
    useEffect(() => {
        if (appSettings) {
            document.documentElement.setAttribute('data-mode', appSettings.mode == 'system' ? defaultMode : appSettings.mode)            
            document.documentElement.setAttribute('data-theme', appSettings.theme)            
        }
    }, [appSettings, defaultMode])

    useCopyPaste(
        (e: ClipboardEvent) => command$.next({ id: CommandID.Copy, e }),
        (e: ClipboardEvent) => {
            if (e.clipboardData.files.length) {
                const files: File[] = []
                for (let i=0; i<e.clipboardData.files.length; i++) {
                    files.push(e.clipboardData.files.item(i))
                }
                command$.next({ id: CommandID.Paste, files })
            } else {
                const data = e.clipboardData.getData('URIs')
                if (data && data.length) {
                    command$.next({ id: CommandID.Paste, uris: JSON.parse(data) })
                }
            }
        }
    )

    useSubscribe(() =>
        file$.subscribe(({path}) => {
            if (path == settingsFile.current) {
                window.f5.settings().then(settings => {
                    setAppSettings(settings)
                }) 
            }
        }),
        []
    )

    useConcatAsyncEffect(async () => {
        if (settingsChanges) {
            await window.f5.saveSettings(settingsChanges)
        }
    }, [settingsChanges])

    useShortcuts(
        appSettings?.keybindings ?? [], 
        (id, e) => command$.next({ id: id as KeyShortcutCommand, e }), [appSettings]
    )

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.TriggerCopy: {
                    document.execCommand('copy')
                    // document.execCommand('paste') is not supported
                    break
                }
            }
        })
    )

    const [queues, {set: addQueue, del: delQueue}] = useMap<string, {type: QueueType, connection: ConnectionID}>()
    useSubscribe(() => 
        queue$.subscribe(({id, event}) => {
            if (event.type == QueueEventType.Create) {
                addQueue(id, { type: event.queueType, connection: event.connection })
            } else if (event.type == QueueEventType.Complete) {
                delQueue(id)
            }
        })
    )

    const [active, setActive] = useState(0)
    useEffect(() => setActive(queues.size-1), [queues])

    return (<>
        {appSettings ? 
            <AppSettingsContext.Provider value={appSettings}>
                <div className={classNames(styles.root, {hasQueues: queues.size > 0})}>
                    <Tooltips>
                        <div className={styles.toolbar}>
                            <a href="https://github.com/miroshnikov/f5" target="_blank"><span>F5</span>FileFive</a>
                            <span>
                                <button 
                                    className="icon" 
                                    data-tooltip={"Connections..." + getTooltipShortcut(CommandID.Connections, appSettings.keybindings)}
                                    onClick={() => command$.next({id: CommandID.Connections})}
                                >
                                    cloud_upload
                                </button>
                                <button 
                                    className="icon" 
                                    data-tooltip={"Settings..." + getTooltipShortcut(CommandID.Settings, appSettings.keybindings)}
                                    onClick={() => command$.next({id: CommandID.Settings})}
                                >
                                    settings
                                </button>
                            </span>
                        </div>
                    </Tooltips>

                    <div className={styles.workspace}>
                        <Workspace onSettingsChange={setSettingsChanges} onChange={setTitle} />
                    </div>

                    {queues.size > 0 && 
                        <div className={styles.queues}>
                            {Array.from(queues.entries()).map(([id, {type, connection}], i) => 
                                <div key={id} onClick={() => setActive(i)} className={classNames({active: i==active})}>
                                    <Queue id={id} type={type} connection={connection} active={i==active} />
                                </div>
                            )}
                        </div>
                    }
                </div>
                <QueueAction />
                <Error />
                <AskForPassword />
                <ConfirmDeletion />
                <Settings />
            </AppSettingsContext.Provider> : 
            <div className="fill-center">
                <div className="center">
                    <Spinner radius="3em" />
                </div>
            </div>
        }
        </>)
}
