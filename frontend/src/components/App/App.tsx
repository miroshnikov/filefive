import React, { useEffect, useState } from "react"
import Workspace from '../Workspace/Workspace'
import styles from './App.less'
import { useMap, useSubscribe } from '../../hooks'
import { queue$ } from '../../observables/queue'
import Queue from '../Queue/Queue'
import { QueueEventType, QueueType, ConnectionID, AppConfig } from '../../../../src/types'
import classNames from "classnames"
import QueueAction from "../QueueAction/QueueAction"
import Error from '../Error/Error'
import { ConfigContext } from '../../context/config'


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
                    <Workspace />
                    {queues.size > 0 && 
                    <div className={styles.queues}>
                        {Array.from(queues.entries()).map(([id, {type, connection}], i) => 
                            <div key={id} onClick={() => setActive(i)} className={classNames({active: i==active})}>
                                <Queue id={id} type={type} connection={connection} active={i==active} />
                            </div>
                        )}
                    </div>
                    }
                    <QueueAction />
                    <Error />
                </div>
            </ConfigContext.Provider> : 
            <span>wait...</span>
        }
        </>)
}
