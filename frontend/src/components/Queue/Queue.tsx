import React, { useState, useMemo } from "react"
import { useSubscribe } from '../../hooks'
import { queue$ } from '../../observables/queue'
import { filter } from 'rxjs/operators'
import { whereEq, ifElse, isNil, always, last, pipe, split } from 'ramda'
import { QueueEventType, QueueType, ConnectionID } from '../../../../src/types'
import { Progress, CircleProgress } from '../../ui'
import styles from './Queue.less'
import { t } from 'i18next'


const captions: Record<QueueType, { msg: string, icon: string }> = {
    [QueueType.Download]: { msg: 'downloading', icon: 'download' },
    [QueueType.Upload]: { msg: 'uploading', icon: 'upload' },
    [QueueType.Remove]: { msg: 'deleting', icon: 'delete' }
}



export default function ({id, type, connection, active}: {id: string, type: QueueType, connection: ConnectionID, active: boolean }) {
    const [count, setCount] = useState(0)
    const [total, setTotal] = useState(1)
    const [done, setDone] = useState(0)

    useSubscribe(() => 
        queue$
            .pipe( filter(whereEq({id})) )
            .subscribe(({event}) => { 
                if (event.type == QueueEventType.Update) {
                    const { totalCnt, doneCnt, totalSize, doneSize } = event.state
                    setCount(totalCnt-doneCnt)
                    setTotal(totalSize)
                    setDone(doneSize)
                }
            }),
        [id]
    )

    const msg = useMemo(
        () => {
            const conn = ifElse(isNil, always(connection), pipe(split('/'), last))(localStorage.getItem(connection))
            return t(captions[type].msg, {count, conn})
        }, 
        [count]
    )

    return <div className={active ? styles.active : styles.inactive}>
        {active ? 
            <>
                <span dangerouslySetInnerHTML={{__html: msg}}></span>
                <div className={styles.progress}>
                    <Progress percent={Math.round(done/total*100)} />
                    <span className="icon" onClick={() => window.f5.stop(id)}>cancel</span>
                </div>        
            </> :
            <CircleProgress percent={Math.round(done/total*100)}>
                <i className='icon'>{captions[type].icon}</i>
            </CircleProgress>
        }
    </div>
}


