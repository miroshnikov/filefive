import React, { useState, useRef } from "react"
import { FileItem } from '../../../../src/FileSystem'
import { queue$ } from '../../observables/queue'
import { useSubscribe } from '../../hooks'
import { QueueEventType, QueueActionType, QueueType } from '../../../../src/types'
import { Modal, Checkbox } from '../../ui/components'
import { dirname, basename } from '../../utils/path'
import styles from './QueueAction.less'
import numeral from 'numeral'


interface QueueConflict {
    id: string
    from: FileItem
    to: FileItem
    queueType: QueueType
    sid?: string
}

export default function QueueAction() {

    const [conflict, setConflict] = useState<QueueConflict>(null)
    const [conflicts, setConflicts] = useState<QueueConflict[]>([])
    const [forAll, setForAll] = useState(false)
    const remember = useRef(false)

    const proceed = (id: string) => {
        if (id == 'ok') {
            window.f5.resolve(conflict.id, { type: QueueActionType.Replace }, forAll, remember.current ? conflict.sid : undefined)
        } else if (id == 'cancel') {
            window.f5.resolve(conflict.id, { type: QueueActionType.Skip }, forAll, remember.current ? conflict.sid : undefined)
        } else {
            window.f5.stop(conflict.id)
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
                conflict ?
                    setConflicts(conflicts => [...conflicts, { id, ...event }]) :
                    setConflict({ id, ...event })
            }
        })
    )

    return <>
        {conflict &&
            <Modal onClose={proceed} buttons={[{id: 'stop', label: 'Stop'}, {id: 'cancel', label: 'Skip'}, {id: 'ok', label: 'Replace'}]}>
                <div className={styles.root}>
                    <p>
                        The destination already contains a {conflict.to.dir ? 'folder' : 'file'} called 
                        <strong>{basename(conflict.to.path)}</strong>
                    </p>
                    <p>Would you like to replace the existing {conflict.to.dir ? 'folder' : 'file'} in <strong>{dirname(conflict.to.path)}</strong></p>

                    <div className={styles.file}>
                        <i className='icon'>{
                            (conflict.queueType == QueueType.Move || conflict.queueType == QueueType.Copy) ? 
                                (conflict.to.dir ? 'folder' : 'file_copy') : 
                                (conflict.queueType == QueueType.Download ? 'computer' : 'cloud')
                        }</i>
                        <p>
                            { conflict.to.dir ? '' : <>{'Size: ' + numeral(conflict.to.size).format('0.0 b')} <br/></> } 
                            Modified: {new Date(conflict?.to.modified).toLocaleString()}
                        </p>
                    </div>

                    <p>with the new one from <strong>{dirname(conflict.from.path)}</strong></p>

                    <div className={styles.file}>
                        <i className='icon'>{
                            (conflict.queueType == QueueType.Move || conflict.queueType == QueueType.Copy) ? 
                                (conflict.from.dir ? 'folder' : 'file_copy') : 
                                (conflict.queueType == QueueType.Download ? 'computer' : 'cloud')
                        }</i>
                        <p>
                            { conflict.to.dir ? '' : <>{'Size: ' + numeral(conflict.from.size).format('0.0 b')} <br/></> } 
                            Modified: {new Date(conflict?.from.modified).toLocaleString()}
                        </p>
                    </div>

                    <div className={styles.checks}>
                        <Checkbox value={forAll} onChange={() => setForAll(v => !v)}>
                            Apply the chosen action to the rest of files
                        </Checkbox>

                        {conflict.sid && forAll &&
                            <Checkbox value={remember.current} onChange={() => remember.current = !remember.current}>
                                Remember for the current session
                            </Checkbox>
                        }
                    </div>
                </div>
            </Modal> 
        }
    </>
}
