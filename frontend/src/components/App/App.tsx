import React, { useEffect, useState, useRef } from "react"
import Workspace from '../Workspace/Workspace'
import styles from './App.less'
import { useMap, useSubscribe } from '../../hooks'
import { queue$ } from '../../observables/queue'
import Queue from '../Queue/Queue'
import { QueueEventType, QueueType, ConnectionID, AppConfig, Path } from '../../../../src/types'
import { parse } from '../../utils/path'
import classNames from "classnames"
import QueueAction from "../QueueAction/QueueAction"
import Error from '../Error/Error'
import AskForPassword from '../../modals/Password'
import ConfirmDeletion from '../../modals/Deletion'
import { ConfigContext } from '../../context/config'



function setTitle(connectionId: ConnectionID|null, connectionName: string, localPath: Path, remotePath: Path) {
    let title = (connectionName ? connectionName + ' - ' : '') + parse(remotePath).name
    document.querySelector<HTMLElement>('head > title').innerText = title
}


export default function () {
    const [config, setConfig] = useState<AppConfig>(null)
    useEffect(() => { window.f5.config().then(config => setConfig(config)) }, [])

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
        {config ? 
            <ConfigContext.Provider value={config}>
                <div className={classNames(styles.root, {hasQueues: queues.size > 0})}>
                    <div className={styles.toolbar}>
                        <a href="https://github.com/miroshnikov/f5" target="_blank"><span>F5</span>FileFive</a>
                        <span>
                            <button className="icon">power_settings_new</button>
                            <button className="icon">settings</button>
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
            </ConfigContext.Provider> : 
            <span>wait...</span>
        }
        </>)
}
