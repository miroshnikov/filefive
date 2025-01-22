import React, { useEffect, useState } from "react"
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'
import { FailureType, ConnectionID } from '../../../../src/types'
import { Modal, ModalButtonID, Password, Checkbox } from '../../ui/components'
import styles from './Password.less'


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

    // useEffect(() => {
    //     if (!connectionId) {
    //         return
    //     }

    //     setTimeout(() => {
    //         const filledPassword = document.querySelector('input[name="password"]:autofill')
    //         if (filledPassword) {
    //             const pass = (filledPassword as HTMLInputElement).value
    //             if (pass) {
    //                 onClose(ModalButtonID.Ok, pass, false)
    //             }
    //         }
    //     }, 500)
    // }, [connectionId])

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

    const onClose = (id: ModalButtonID, pass: string = null, rem: boolean = null) => {
        window.f5.login(connectionId, id == ModalButtonID.Ok ? (pass ?? password) : false, rem ?? remember)
        setConnectionId(undefined)
        console.log('set conn undefind')
    }
    
    return <>
        {connectionId &&
            <Modal buttons={buttons} onClose={onClose}>
                <form className={styles.form} autoComplete="on">
                    <p>Connecting <em>{connectionId}</em>...</p>
                    <input type='text' name="username" value={connectionId} autoComplete="username" readOnly />
                    <p>Password: <Password onChange={setPassword} name='password' autoComplete='current-password' /></p>
                    <p>
                        <Checkbox onChange={remember => setRemember(remember)} value={remember}>Remember password for this session</Checkbox>
                    </p>
                </form>
            </Modal>
        }
    </>
}