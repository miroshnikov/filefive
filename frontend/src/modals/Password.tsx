import React, { useState } from "react"
import { useSubscribe } from '../hooks'
import { error$ } from '../observables/error'
import { FailureType, ConnectionID } from '../../../src/types'
import { Modal, ModalButtonID, Password, Checkbox } from '../ui/components'


export default function AskForPassword() {
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
        window.f5.login(connectionId, id == ModalButtonID.Ok ? password : false, remember)
        setConnectionId(undefined)
    }
    
    return <>
        {connectionId && 
            <Modal buttons={buttons} onClose={onClose}>
                <section>
                    <p>Connecting <strong>{connectionId}</strong>...</p>
                    <p>Password: <Password onChange={setPassword} /></p>
                    <p>
                        <Checkbox onChange={remember => setRemember(remember)} value={remember}>Remember password for this session</Checkbox>
                    </p>
                </section>
            </Modal>
        }
    </>
}