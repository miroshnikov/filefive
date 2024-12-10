import React, { useState, useEffect, useContext } from "react"
import { Path } from '../../../../src/types'
import { Modal, ModalButtonID, Select, Password } from '../../ui/components'
import { useForm, Controller } from "react-hook-form"
import { parse } from '../../utils/path'
import classNames from "classnames"
import { evolve, trim } from 'ramda'
import { themes } from '../Settings/Settings'
import { AppSettingsContext } from '../../context/config'
import styles from './Connection.less'
import themesStyle from '../Settings/Settings.less'



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

    const appSettings = useContext(AppSettingsContext)

    const [name, setName] = useState('')
    const [scheme, setScheme] = useState('sftp')
    const [values, setValues] = useState({ host: '', port: '', user: '', password: '' })
    const [theme, setTheme] = useState(appSettings.theme)

    useEffect(() => { 
        if (file.length) {
            setName( parse(file).name )
            window.f5.get(file).then(config => {
                if (config) {
                    const {scheme, host, port, user, password} = config
                    setScheme(scheme)
                    setValues({host, port: String(port), user, password})
                    setTheme(config.theme ?? appSettings.theme)
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
            }, { scheme, ...getValues(), theme })
            if (!data.port) {
                data.port = scheme == 'sftp' ? 22 : 21
            }
            await window.f5.save(file, data)
            if (id == ModalButtonID.Ok) {
                onConnect(file)            
            }
        }
        onClose()
    }

    return <>
        {file.length > 0 &&
            <Modal buttons={buttons} onClose={onModalClose}>
                <form className={styles.root} onSubmit={e => e.preventDefault()} autoComplete="off">
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
                        render={({field}) => <Password {...field} placeholder="Will ask if empty" autoComplete="off" />}
                    />

                    <label>Color Theme:</label>
                    <div className={themesStyle.themes}>
                        {themes.map(t => 
                            <span key={t}
                                data-mode="dark"
                                data-theme={t}
                                data-active={t==theme} 
                                onClick={() => setTheme(t)}
                            ></span>
                        )}
                    </div>
                </form>
            </Modal>
        }
    </>
}