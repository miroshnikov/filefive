import React, { useState, useEffect } from "react"
import { Path } from '../../../../src/types'
import { Modal, ModalButtonID, Select, Password } from '../../ui/components'
import { useForm, Controller } from "react-hook-form"
import { parse } from '../../utils/path'
import classNames from "classnames"
import styles from './Connection.less'
import { evolve, trim } from 'ramda'



const schemes = [
    {
        value: 'sftp',
        label: 'SFTP'
    },
    {
        value: 'ftp',
        label: 'FTP'
    }
]


type FormValues = {
    host: string
    port: string
    user: string
    password: string
}

export default function ({ file, onConnect, onClose }: { file?: Path, onConnect: (path: Path) => void, onClose: () => void }) {
    const [name, setName] = useState('')
    const [scheme, setScheme] = useState('sftp')
    const [values, setValues] = useState({ host: '', port: '', user: '', password: '' })

    useEffect(() => { 
        if (file.length) {
            setName( parse(file).name )
            window.f5.get(file).then(config => {
                if (config) {
                    const {scheme, host, port, user, password} = config
                    setScheme(scheme)
                    setValues({host, port: String(port), user, password})
                }
            })
        }
    }, [file])

    const {
        register,
        formState: { errors, isValid },
        control,
        getValues
    } = useForm<FormValues>({ mode: 'all', values })

    const buttons = [
        {
            id: ModalButtonID.Cancel,
            label: 'Cancel'
        },
        {
            id: 'save',
            label: 'Save',
            disabled: !isValid
        },
        {
            id: ModalButtonID.Ok,
            label: 'Connect',
            disabled: !isValid
        } 
    ]

    const onModalClose = async (id: string) => {
        if (id == 'save' || id == ModalButtonID.Ok) {
            const data = evolve({
                host: trim,
                port: parseInt,
                user: trim
            }, { scheme, ...getValues() })
            if (!data.port) {
                data.port = scheme == 'sftp' ? 22 : 21
            }
            await window.f5.save(file, data)
        }
        if (id == ModalButtonID.Ok) {
            onConnect(file)            
        }
        onClose()
    }

    return <>
        {file.length > 0 &&
            <Modal buttons={buttons} onClose={onModalClose}>
                <form className={styles.root} onSubmit={e => e.preventDefault()}>
                    <h1>{name}</h1>

                    <label>Protocol:</label>
                    <Select options={schemes} onChange={setScheme} value={scheme} />

                    <ul>
                        <li>
                            <label>Host:</label>
                            <input className={classNames('dry', {error: errors.host})} 
                                {...register("host", { required: true })}
                                placeholder="example.com" 
                                autoComplete="off"
                            />
                        </li>
                        <li>
                            <label>Port:</label>
                            <input className={classNames('dry', {error: errors.port})} 
                                {...register("port", { pattern: /\d+/g })}
                                placeholder={scheme == 'sftp' ? '22' : '21'} 
                                autoComplete="off"
                            />
                        </li>
                    </ul>

                    <label>User:</label>
                    <input className={classNames('dry', {error: errors.user})} 
                        {...register("user", { required: true })}
                        placeholder="john" 
                        autoComplete="off"
                    />

                    <label>Password:</label>
                    <Controller
                        name="password"
                        control={control}
                        render={({field}) => <Password {...field} placeholder="Ask if empty" autoComplete="off" />}
                    />
                </form>
            </Modal>
        }
    </>
}