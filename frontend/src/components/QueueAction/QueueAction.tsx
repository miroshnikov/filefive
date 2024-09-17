import React, { useState } from "react"
import { FileItem } from '../../../../src/FileSystem'
import { queue$ } from '../../observables/queue'
import { useSubscribe } from '../../hooks'
import { QueueEventType, QueueActionType, QueueType } from '../../../../src/types'
import { Modal } from '../../ui/components'
import { dirname, basename } from '../../utils/path'
import styles from './QueueAction.less'
import numeral from 'numeral'


interface QueueConflict {
    id: string
    from: FileItem
    to: FileItem
    queueType: QueueType
}

export default function QueueAction() {

    const [conflict, setConflict] = useState<QueueConflict>(null)
    const [conflicts, setConflicts] = useState<QueueConflict[]>([])

    const proceed = (id: string) => {
        if (id == 'ok') {
            window.f5.resolve(conflict.id, { type: QueueActionType.Replace })
        } else {
            window.f5.resolve(conflict.id, { type: QueueActionType.Skip })
        }
        conflicts.length ?
            setConflicts(conflicts => { 
                setConflict(conflicts[0])
                return conflicts.slice(1)
            }) :
        setConflict(null)
    }

    useSubscribe(() => 
        queue$.subscribe(({id, event}) => {
            if (event.type == QueueEventType.Ask) {
                console.log('Conflict', id, event)
                conflict ?
                    setConflicts(conflicts => [...conflicts, { id, ...event }]) :
                    setConflict({ id, ...event })
            }
        })
    )

    return <>
        {conflict &&
            <Modal onClose={proceed} buttons={[{id: 'cancel', label: 'Skip'}, {id: 'ok', label: 'Replace'}]}>
                <div className={styles.root}>
                    <p>The destination already contains a file called <strong>{basename(conflict.to.path)}</strong></p>
                    <p>Would you like to replace the existing file in <strong>{dirname(conflict.to.path)}</strong></p>

                    <div className={styles.file}>
                        <i className='icon'>{conflict.queueType == QueueType.Download ? 'computer' : 'cloud'}</i>
                        <p><>
                            Size: {numeral(conflict.to.size).format('0.0 b')} <br/>
                            Modified: {new Date(conflict?.to.modified).toLocaleString()}
                        </></p>
                    </div>

                    <p>with the new one from <strong>{dirname(conflict.from.path)}</strong></p>

                    <div className={styles.file}>
                        <i className='icon'>{conflict.queueType == QueueType.Upload ? 'computer' : 'cloud'}</i>
                        <p><>
                            Size: {numeral(conflict.from.size).format('0.0 b')} <br/>
                            Modified: {new Date(conflict?.from.modified).toLocaleString()}
                        </></p>
                    </div>
                </div>
            </Modal> 
        }
    </>
}
