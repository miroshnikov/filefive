import React, { useEffect, useState, useRef, useLayoutEffect } from "react"
import Workspace, { AppSettingsChanges } from '../Workspace/Workspace'
import styles from './App.less'
import { useMap, useSubscribe, useShortcuts, useMode, useCopyPaste, useEffectOnUpdate } from '../../hooks'
import { queue$ } from '../../observables/queue'
import Queue from '../Queue/Queue'
import { LocalFileSystemID, QueueEventType, QueueType, ConnectionID, AppSettings, Path } from '../../../../src/types'
import { parse } from '../../utils/path'
import { createURI } from '../../../../src/utils/URI'
import classNames from "classnames"
import QueueAction from "../QueueAction/QueueAction"
import Error from '../Error/Error'
import AskForPassword from '../../modals/Password/Password'
import ConfirmDeletion from '../../modals/Deletion'
import ConfirmClearance from '../../modals/Clearance'
import { command$ } from '../../observables/command'
import { file$ } from '../../observables/file'
import { CommandID, KeyShortcutCommand } from '../../commands'
import { AppSettingsContext } from '../../context/config'
import { Tooltips, Spinner } from '../../ui/components'
import Settings from '../../modals/Settings/Settings'
import info from '../../../../package.json'
import { equals, mergeDeepRight } from 'ramda'


function setTitle(connectionId: ConnectionID|null, connectionName: string, localPath: Path, remotePath: Path) {
    let title = (connectionName ? connectionName + ' - ' : '') + parse(remotePath).name
    document.querySelector<HTMLElement>('head > title').innerText = title
}


export default function App () {
    const [appSettings, setAppSettings] = useState<AppSettings>(null)

    const currAppSettings = useRef<AppSettings>(null)
    const settingsFile = useRef('')
    const [settingsChanges, setSettingsChanges] = useState<AppSettingsChanges>({})
    const allSettingsChanges = useRef<AppSettingsChanges>({})
   
    useEffect(() => { 
        window.f5.settings().then(settings => {
            currAppSettings.current = settings
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
    useLayoutEffect(() => {
        if (appSettings) {
            document.documentElement.setAttribute('data-mode', appSettings.mode == 'system' ? defaultMode : appSettings.mode)            
            document.documentElement.setAttribute('data-theme', appSettings.theme)
            if (appSettings.fileTheme) {
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = `icon-themes/${appSettings.fileTheme}.css`
                document.head.appendChild(link)
            }
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
                    if (!equals(currAppSettings.current, settings)) {
                        if (currAppSettings.current.fileTheme != settings.fileTheme) {
                            location.reload()
                        } else {
                            currAppSettings.current = settings
                            setAppSettings(settings)
                        }
                    }
                }) 
            }
        }),
        []
    )

    useEffectOnUpdate(() => {
        allSettingsChanges.current = mergeDeepRight(allSettingsChanges.current, settingsChanges) as AppSettingsChanges
        currAppSettings.current = mergeDeepRight(currAppSettings.current, allSettingsChanges.current) as AppSettings
        const tm = setTimeout(() => {
            window.f5.saveSettings(allSettingsChanges.current)
        }, 2000)
        return () => clearTimeout(tm)
    }, [settingsChanges])

    useShortcuts(
        appSettings?.keybindings ?? [], 
        (id, e) => command$.next({ id: id as KeyShortcutCommand, e }), 
        [appSettings]
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
                    <Tooltips shortcuts={appSettings.keybindings}>
                        <div className={styles.toolbar}>
                            <span>
                                <a href="https://github.com/miroshnikov/filefive" target="_blank">
                                    <span>F5</span>FileFive 
                                    <small>{info.version}</small>
                                </a>
                                <nav>
                                    <svg viewBox="0 0 16 16" width="16" height="16">
                                        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                                    </svg>
                                    <a href="https://github.com/miroshnikov/filefive" target="_blank">
                                        <svg viewBox="0 0 16 16" width="16" height="16">
                                            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                                        </svg>
                                        <span>Star</span>
                                    </a>
                                    <a href="https://github.com/miroshnikov/filefive/discussions" target="_blank">
                                        <svg viewBox="0 0 16 16" width="16" height="16">
                                            <path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z"></path>
                                        </svg>
                                        <span>Discuss</span>
                                    </a>
                                    <a href="https://github.com/miroshnikov/filefive/issues" target="_blank">
                                        <svg viewBox="0 0 16 16" width="16" height="16">
                                            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                                        </svg>
                                        <span>Issue</span>
                                    </a>
                                </nav>
                            </span>
                            <span>
                                <button 
                                    className="icon"
                                    data-command={CommandID.Connections}
                                    data-tooltip="Connections..."
                                    onClick={() => command$.next({id: CommandID.Connections})}
                                >
                                    cloud_upload
                                </button>
                                <button 
                                    className="icon" 
                                    data-command={CommandID.Settings}
                                    data-tooltip="Settings..."
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
                <ConfirmClearance />
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
