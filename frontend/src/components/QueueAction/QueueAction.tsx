import React, { useState } from "react"
import { FileInfo } from '../../../../src/types'
import { FileItem } from '../../../../src/FileSystem'
import { queue$ } from '../../observables/queue'
import { useSubscribe } from '../../hooks'
import { QueueEventType, QueueActionType } from '../../../../src/types'
import { Modal } from '../../ui/components'
import { dirname, basename } from '../../utils/path'
import { isLocal } from '../../../../src/utils/URI'
import styles from './QueueAction.less'
import { t } from 'i18next'


interface QueueConflict {
    id: string
    from: FileItem
    to: FileItem
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
                conflict ?
                    setConflicts(conflicts => [...conflicts, { id, ...event }]) :
                    setConflict({ id, ...event })
            }
        })
    )

    return <>
        {conflict &&
            <Modal onClose={proceed} buttons={[{id: 'ok', label: 'Replace'}, {id: 'cancel', label: 'Skip'}]}>
                <div>
                    The destination already contains a file called <strong>{basename(conflict.to.path)}</strong><br/>
                    Would you like to replace the existing file in <strong>{dirname(conflict.to.path)}</strong><br/>

                    <div className={styles.file}>
                        <i className='icon'>{isLocal(conflict.to.URI) ? 'computer' : 'cloud'}</i>
                        <p><>
                            Size: {conflict.to.size} <br/>
                            {t('modified', {val: conflict.to.modified}) } <br/>
                        </></p>
                    </div>

                    with the new one from <strong>{dirname(conflict.from.path)}</strong><br/>

                    <div className={styles.file}>
                        <i className='icon'>{isLocal(conflict.from.URI) ? 'computer' : 'cloud'}</i>
                        <p><>
                            Size: {conflict.from.size} <br/>
                            {t('modified', {val: conflict.from.modified})} <br/>
                        </></p>
                    </div>
                </div>
            </Modal> 
        }
    </>
}
