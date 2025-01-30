import React, { useState, useRef, useEffect } from "react"
import { useSubscribe } from '../../hooks'
import { error$ } from '../../observables/error'
import { FailureType, ConnectionID } from '../../../../src/types'
import { Modal, ModalButtonID, Password, Checkbox } from '../../ui/components'
import styles from './Password.less'


export default function AskForPassword() {
    const [connectionId, setConnectionId] = useState<ConnectionID>()
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(true)
    const input = useRef<HTMLInputElement>(null)

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.Unauthorized) {
                setConnectionId(error.id)
            }
        })
    )

    useEffect(() => {
        connectionId && input.current?.focus()
    }, [connectionId])

    // useEffect(() => {        // TODO: fix auto-login in FireFox
    //     if (!connectionId) {
    //         return
    //     }
    //     setTimeout(() => {
    //         const filledPassword = document.querySelector('input[name="password"]:autofill')
    //         const pass = (filledPassword as HTMLInputElement)?.value
    //         pass ?
    //             onClose(ModalButtonID.Ok, pass, false) :
    //             setShow(true)
    //     }, 600)
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
        if (id != ModalButtonID.Ok) {
            const u = new URL(window.location.toString())
            u.searchParams.delete('connect')
            history.replaceState(null, '', u.toString())
        }
        setConnectionId(undefined)
    }
    
    return <>
        {connectionId &&
            <Modal buttons={buttons} onClose={onClose}>
                <form className={styles.form} autoComplete="on">
                    <p>Connecting <em>{connectionId}</em>...</p>
                    <div className="username">
                        <input type='text' name="username" value={connectionId} autoComplete="username" readOnly />
                    </div>
                    <p>Password: <Password ref={input} onChange={setPassword} name='password' autoComplete='current-password' /></p>
                    <p>
                        <Checkbox onChange={remember => setRemember(remember)} value={remember}>Remember password for this session</Checkbox>
                    </p>
                </form>
            </Modal>
        }
    </>
}