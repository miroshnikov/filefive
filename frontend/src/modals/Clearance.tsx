import React, { useState, useEffect } from "react"
import { Modal, ModalButtonID } from '../ui/components'
import { URI, FailureType } from '../../../src/types'
import { parseURI } from '../../../src/utils/URI'
import { useSubscribe } from '../hooks'
import { error$ } from '../observables/error'
import { basename } from '../utils/path'


export default function ConfirmDeletion() {
    const [file, setFile] = useState<URI>()
    const [name, setName] = useState('')

    useEffect(() => {
        setName(file ? basename(parseURI(file).path) : '')
    }, [file])

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.ConfirmClear) {
                setFile(error.file)
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
            label: 'Clear Contents'
        } 
    ]

    const onClose = (id: ModalButtonID) => {
        if (id == ModalButtonID.Ok) {
            window.f5.clear(file)
        }
        setFile(null)
    }

    return <>
        {file && 
            <Modal buttons={buttons} onClose={onClose}>
                <div className='modal-content' style={{textAlign: 'center'}}>
                    <p>
                        <strong>
                            <span>Are you sure you want to clear contents of <br/> '{name}'?</span> 
                        </strong>
                    </p>
                    <p>
                        <i>This action is irreversible!</i>
                    </p>
                </div>
            </Modal>
        }
    </>
}