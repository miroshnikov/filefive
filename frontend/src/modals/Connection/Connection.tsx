import React, { useState, useEffect, useContext } from "react"
import { Path } from '../../../../src/types'
import { Modal, ModalButtonID, Select, Password, Checkbox } from '../../ui/components'
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
    scheme: string
    host: string
    port: string
    user: string
    password: string
    privatekey: string
}

export default function ({ file, onConnect, onClose }: { file?: Path, onConnect: (path: Path) => void, onClose: () => void }) {

    const appSettings = useContext(AppSettingsContext)

    const [editing, setEditing] = useState(false)
    const [name, setName] = useState('')
    const [scheme, setScheme] = useState('sftp')
    const [values, setValues] = useState({ 
        scheme: 'sftp', 
        host: '', 
        port: '', 
        user: '', 
        password: '',
        privatekey: ''
    })
    const [theme, setTheme] = useState(appSettings.theme)
    const [username, setUsername] = useState('')
    const [pass, setPass] = useState('')
    const [savePassword, setSavePassword] = useState(false)
    const [usePrivateKey, setUsePrivateKey] = useState(false)


    useEffect(() => { 
        if (file.length) {
            setName( parse(file).name )
            window.f5.get(file).then(config => {
                if (config) {
                    setEditing(true)
                    const {scheme, host, port, user, password, privatekey} = config
                    setValues({scheme, host, port: String(port), user, password, privatekey})
                    setTheme(config.theme ?? appSettings.theme)
                    setSavePassword(password.length > 0)
                    setUsePrivateKey(privatekey.length > 0)
                }
            })
        }
    }, [file])

    useEffect(() => reset(values), [values])

    const {
        register,
        formState: { errors, isValid },
        control,
        getValues,
        watch,
        reset
    } = useForm<FormValues>({ mode: 'all', values })

    useEffect(() => {
        const { unsubscribe } = watch(({scheme: s, user, host, port, password}) => {
            setUsername(`${s}://${user}@${host}:${port ? port : (s == 'sftp' ? 22 : 21)}`)
            setScheme(s)
            setPass(password)
        })
        return () => unsubscribe()
    }, [watch])

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
            }, { ...getValues(), theme })
            if (!data.port) {
                data.port = data.scheme == 'sftp' ? 22 : 21
            }
            if (scheme == 'sftp') {
                if (usePrivateKey) {
                    data.privatekey ||= '~/.ssh/id_ed25519'
                } else {
                    data.privatekey = ''
                }
            }
            await window.f5.save(file, { ...data, savePassword })
            if (id == ModalButtonID.Ok) {
                onConnect(file)            
            }
        }
        onClose()
        reset({ scheme: 'sftp', host: '', port: '', user: '', password: '', privatekey: '' })
        setTheme(appSettings.theme)
    }

    return <>
        {file.length > 0 &&
            <Modal buttons={buttons} onClose={onModalClose} options={{okOnEnter: false, x: true}}>
                <form className={styles.root} onSubmit={e => e.preventDefault()}>
                    <h1>{name}</h1>

                    <label>Protocol:</label>
                    <Controller
                        name="scheme"
                        control={control}
                        render={({field}) => <Select {...field} options={schemes} />}
                    />

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
                        placeholder="username"
                        autoComplete="off"
                    />

                    <div className="username">
                        <input
                            type="text" 
                            name="username" 
                            placeholder="username"
                            defaultValue={username} 
                            autoComplete="username"
                        />
                    </div>

                    {(scheme != 'sftp' || !usePrivateKey) && <>                       
                        <label>Password:</label>
                        <Controller
                            name="password"
                            control={control}
                            render={({field}) => 
                                <Password {...field} placeholder="Will ask if empty" autoComplete='current-password' />
                            }
                        />
                    </>}

                    {(scheme != 'sftp' || !usePrivateKey) && pass && <>
                        <label></label>
                        <Checkbox onChange={setSavePassword} value={savePassword}>Save password on disk</Checkbox>
                        <p>
                            Passwords are stored in plain text. Use the browser password manager for a better protection.
                        </p>
                    </>}

                    {scheme == 'sftp' && <>
                        <label></label>
                        <Checkbox onChange={setUsePrivateKey} value={usePrivateKey}>Use SSH Private Key</Checkbox>
                    </>}

                    {scheme == 'sftp' && usePrivateKey && <>
                        <label>Key File Path:</label>
                        <input className='dry'
                            {...register("privatekey")}
                            placeholder="~/.ssh/id_ed25519 (by default)"
                            autoComplete="off"
                        />
                    </>}

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