import React, { useEffect, useState } from "react"
import Workspace from '../Workspace/Workspace'
import styles from './App.less'
import { useMap, useSubscribe, useShortcuts } from '../../hooks'
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
import { CommandID } from '../../commands'
import { AppSettingsContext } from '../../context/config'


function setTitle(connectionId: ConnectionID|null, connectionName: string, localPath: Path, remotePath: Path) {
    let title = (connectionName ? connectionName + ' - ' : '') + parse(remotePath).name
    document.querySelector<HTMLElement>('head > title').innerText = title
}


export default function App () {
    const [appSettings, setAppSettings] = useState<AppSettings>(null)
    useEffect(() => { 
        window.f5.config().then(settings => setAppSettings(settings)) 
    }, [])

    useEffect(() => {
        if (appSettings) {
            window.f5.watch(createURI(LocalFileSystemID, appSettings.settings))
        }
    }, [appSettings])

    useSubscribe(() =>
        file$.subscribe(() => 
            window.f5.config().then(settings => setAppSettings(settings)) 
        )
    )

    useShortcuts(appSettings?.keybindings ?? [], id => command$.next({id: id as CommandID}), [appSettings])

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Settings: {
                    console.log('show settings')
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
                    <div className={styles.toolbar}>
                        <a href="https://github.com/miroshnikov/f5" target="_blank"><span>F5</span>FileFive</a>
                        <span>
                            <button className="icon" onClick={() => command$.next({id: CommandID.Connections})}>
                                cloud_upload
                            </button>
                            <button className="icon" onClick={() => command$.next({id: CommandID.Settings})}>
                                settings
                            </button>
                        </span>
                    </div>
                    <div className={styles.workspace}>
                        <Workspace onChange={setTitle} />
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
            </AppSettingsContext.Provider> : 
            <span>wait...</span>
        }
        </>)
}
