import React, { useState, useEffect } from "react"
import { Path } from '../../../../src/types'
import { Modal, ModalButtonID, Select, Password } from '../../ui/components'
import { useForm, SubmitHandler, Controller } from "react-hook-form"
import { parse } from '../../utils/path'
import { createURI } from '../../utils/URI'
import { LocalFileSystemID } from '../../../../src/types'
import classNames from "classnames"
import styles from './Connection.less'



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


type FormValues = {
    host: string
    port: string
    user: string
    password: string
}

export default function ({ file, onConnect, onClose }: { file?: Path, onConnect: (path: Path) => void, onClose: () => void }) {
    const [name, setName] = useState('')
    const [scheme, setScheme] = useState('sftp')

    useEffect(() => { 
        file.length && setName( parse(file).name )
    }, [file])

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        control,
        getValues
    } = useForm<FormValues>({ mode: 'all' })
    const onSubmit: SubmitHandler<FormValues> = (data) => console.log('Form submitted with: ', data)


    const buttons = [
        {
            id: ModalButtonID.Cancel,
            label: 'Cancel',

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
            const data = { scheme, ...getValues() }
            if (!data.port) {
                data.port = scheme == 'sftp' ? '22' : '21'
            }
            await window.f5.write(createURI(LocalFileSystemID, file), JSON.stringify(data))
        }
        if (id == ModalButtonID.Ok) {
            onConnect(file)            
        }
        onClose()
    }

    return <>
        {file.length > 0 &&
            <Modal buttons={buttons} onClose={onModalClose}>
                <form className={styles.root} onSubmit={handleSubmit(onSubmit)}>
                    <h1>{name}</h1>

                    <label>Protocol:</label>
                    <Select options={connTypes} onChange={setScheme} />

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