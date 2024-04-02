import React, { useState } from "react"
import { useSubscribe } from '../hooks'
import { error$ } from '../observables/error'
import { FailureType, ConnectionID } from '../../../src/types'
import { Modal, ModalButtonID, Password } from '../ui/components'


export default function () {
    const [connectionId, setConnectionId] = useState<ConnectionID>()
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(true)

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.Unauthorized) {
                setConnectionId(error.id)
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
            label: 'Ok',
            disabled: !password.length
        } 
    ]

    const onClose = (id: ModalButtonID) => {
        if (id == ModalButtonID.Ok) {
            window.f5.login(connectionId, password, remember)
        }
        setConnectionId(undefined)
    }
    
    return <>
        {connectionId && 
            <Modal buttons={buttons} onClose={onClose}>
                <div>
                    <p>{connectionId}</p>
                    <Password onChange={setPassword} />
                    Save: <input type="checkbox" checked={remember} onChange={() => setRemember(remember => !remember)} />
                </div>
            </Modal>
        }
    </>
}