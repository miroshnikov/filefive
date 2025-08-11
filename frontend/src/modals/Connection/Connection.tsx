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



const protocols = [
    {
        value: 'sftp',
        label: 'SFTP - SSH File Transfer Protocol'
    },
    {
        value: 'ftp',
        label: 'FTP - File Transfer Protocol'
    },
    {
        value: 's3',
        label: 'S3 - Amazon Simple Storage Service'
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

    const [name, setName] = useState('')
    const [protocol, setProtocol] = useState('sftp')
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
        reset,
        setValue
    } = useForm<FormValues>({ mode: 'all', values })

    useEffect(() => {
        const { unsubscribe } = watch(({scheme, user, host, port, password}) => {
            setUsername(`${scheme}://${user}@${host}:${port ? port : (scheme == 'sftp' ? 22 : 21)}`)
            setProtocol(scheme)
            setPass(password)
        })
        return () => unsubscribe()
    }, [watch])

    const parseHost = (host: string) => {
        const h = host.trim()
        const scheme = h.match(/^s?ftp:/)
        if (scheme) {
            return h.substring(scheme[0].length+2)
        }
        if (protocol == 's3' && h.length > 8 && !h.match(/^https?:/)) {
            return `https://${h}`
        }
        return h
    }

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

    const defaultPort = () => {
        return {
            sftp: '22',
            ftp: '21',
            s3: '443'
        }[protocol] ?? ''
    }

    const onModalClose = async (id: string) => {
        if (id == 'save' || id == ModalButtonID.Ok) {

            const data = evolve({
                host: parseHost,
                port: p => parseInt(p || defaultPort()),
                user: trim
            }, { ...getValues(), theme })

            if (protocol == 'sftp') {
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
                        render={({field}) => <Select {...field} options={protocols} />}
                    />

                    <ul>
                        <li>
                            <label>{protocol == 's3' ? 'URL' : 'Host'}:</label>
                            <input className={classNames('dry', {error: errors.host})} 
                                {...register("host", { required: true })}
                                placeholder={protocol == 's3' ? 'https://s3.amazonaws.com' : 'example.com'}
                                autoComplete="off"
                                onBlur={() => setValue('host', parseHost(getValues().host))}
                            />
                        </li>
                        <li>
                            <label>Port:</label>
                            <input className={classNames('dry', {error: errors.port})} 
                                {...register("port", { pattern: /\d+/g })}
                                placeholder={defaultPort()} 
                                autoComplete="off"
                            />
                        </li>
                    </ul>

                    <label>{protocol == 's3' ? 'Access Key Id' : 'User'}:</label>
                    <input className={classNames('dry', {error: errors.user})} 
                        {...register("user", { required: true })}
                        placeholder={protocol == 's3' ? 'unique identifier' : 'username'}
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

                    {(protocol != 'sftp' || !usePrivateKey) && <>                       
                        <label>{protocol == 's3' ? 'Secret Access Key' : 'Password'}:</label>
                        <Controller
                            name="password"
                            control={control}
                            render={({field}) => 
                                <Password {...field} placeholder="Will ask if empty" autoComplete='current-password' />
                            }
                        />
                    </>}

                    {(protocol != 'sftp' || !usePrivateKey) && pass && <>
                        <label></label>
                        <Checkbox onChange={setSavePassword} value={savePassword}>Save password on disk</Checkbox>
                        <p>
                            Passwords are stored in plain text. Use the browser password manager for a better protection.
                        </p>
                    </>}

                    {protocol == 'sftp' && <>
                        <label></label>
                        <Checkbox onChange={setUsePrivateKey} value={usePrivateKey}>Use SSH Private Key</Checkbox>
                    </>}

                    {protocol == 'sftp' && usePrivateKey && <>
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