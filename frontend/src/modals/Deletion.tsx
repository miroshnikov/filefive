import React, { useState, useEffect } from "react"
import { Modal, ModalButtonID } from '../ui/components'
import { URI, FailureType } from '../../../src/types'
import { parseURI } from '../../../src/utils/URI'
import { useSubscribe } from '../hooks'
import { error$ } from '../observables/error'
import { basename } from '../utils/path'


export default function ConfirmDeletion() {
    const [files, setFiles] = useState<URI[]>([])
    const [names, setNames] = useState<string[]>([])
    const [isLocal, setLocal] = useState(true)

    useEffect(() => {
        setLocal(files.length && files[0].substring(0, 5) == 'file:')
        setNames(files.map(u => basename( parseURI(u).path) ))
    }, [files])

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.ConfirmDeletion) {
                setFiles(error.files)
            }
        })
    )

    const buttons = [
        {
            id: ModalButtonID.Cancel,
            label: 'Cancel'
        },
        {
            id: ModalButtonID.Ok,
            label: isLocal ? 'Move to Trash' : 'Delete Forever'
        } 
    ]

    const onClose = (id: ModalButtonID) => {
        if (id == ModalButtonID.Ok) {
            window.f5.remove(files, true)
        }
        setFiles([])
    }

    return <>
        {files.length > 0 && 
            <Modal buttons={buttons} onClose={onClose}>
                <div className='modal-content' style={{textAlign: 'center'}}>
                    <p>
                        <strong>
                            {names.length > 1 ? 
                                `Are you sure you want to delete ${names.length} files/directories and their contents?` : 
                                <span>Are you sure you want to delete <br/> '{names[0]}'?</span>
                            }   
                        </strong>
                    </p>
                    <p>
                        <i>
                            {isLocal ? 
                                `You can restore ${names.length > 1 ? 'these files' : 'this file'} from the Trash.` :
                                'This action is irreversible!'
                            }
                        </i>
                    </p>
                    {/* Delete immediately */}
                </div>
            </Modal>
        }
    </>
}