import React, { useState, useEffect } from "react"
import { Modal, ModalButtonID } from '../ui'
import { FailureType } from '../../../src/types'
import { useSubscribe } from '../hooks'
import { error$ } from '../observables/error'
import { Select, Password } from '../ui'


const connTypes = [
    {
        value: 'sftp',
        label: 'SFTP'
    },
    {
        value: 'ftp',
        label: 'FTP'
    }
]

export default function () {
    const [file, setFile] = useState('')
    const [protocol, setProtocol] = useState('sftp')

    const buttons = [
        {
            id: ModalButtonID.Cancel,
            label: 'Cancel'
        },
        {
            id: 'save',
            label: 'Save'
        },
        {
            id: ModalButtonID.Ok,
            label: 'Connect'
        } 
    ]

    useSubscribe(() => 
        error$.subscribe(error => {
            if (error.type == FailureType.NewConnection) {
                console.log('NewConnection!!')
                setFile(error.file)
            }
        })
    )

    const onClose = (id: ModalButtonID) => {

    }

    return <>
        {file.length > 0 && 
            <Modal buttons={buttons} onClose={onClose}>
                <form>
                    <label>Protocol:</label>
                    <Select options={connTypes} onChange={setProtocol} />

                    <label>Host:</label>
                    <input className="dry" placeholder="example.com" />

                    <label>Port:</label>
                    <input className="dry" />

                    <label>User:</label>
                    <input className="dry" placeholder="john" />

                    <label>Password:</label>
                    <Password onChange={v => console.log(v)} placeholder="Ask if empty" />
                </form>
            </Modal>
        }
    </>
}