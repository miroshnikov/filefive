import React, { useState, useContext } from "react"
import { Modal, ModalButtonID, Select } from '../../ui/components'
import classNames from "classnames"
import { useSubscribe } from '../../hooks'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'
import { AppSettingsContext } from '../../context/config'
import { createURI } from '../../../../src/utils/URI'
import { mergeRight, omit } from 'ramda'
import { LocalFileSystemID, AppSettings } from '../../../../src/types'
import styles from './Settings.less'

export const themes = ['black', 'blue', 'green', 'pink']

const fileIconThemes = [
    { value: '', label: 'None' },
    { value: 'seti', label: 'Seti (Visual Studio Code)' },
    { value: 'material', label: 'Material Icon Theme' },
    { value: 'vsicons', label: 'VSCode Icons' },
    { value: 'ayu', label: 'Ayu' },
    { value: 'vscodegreat', label: 'VSCode Great Icons' },
    { value: 'fileicons', label: 'File Icons' },
    { value: 'nomo', label: 'Nomo Dark' }
]

const buttons = [
    {
        id: ModalButtonID.Cancel,
        label: 'Cancel'
    },
    {
        id: ModalButtonID.Ok,
        label: 'Save'
    } 
]

export default function Settings() {
    const appSettings = useContext(AppSettingsContext)

    const [shown, show] = useState(false)
    const [mode, setMode] = useState<AppSettings['mode']>(appSettings.mode)
    const [theme, setTheme] = useState(appSettings.theme)
    const [fileTheme, setFileTheme] = useState(appSettings.fileTheme ?? '')
    const [timeFmt, setTimeFmt] = useState(appSettings.timeFmt)
    const [sizeFmt, setSizeFmt] = useState(appSettings.sizeFmt)

    useSubscribe(() => 
        command$.subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Settings: {
                    show(true)
                    break
                }
            }
        })
    )

    const onClose = (id: ModalButtonID) => {
        show(false)
        if (id == ModalButtonID.Ok) {
            const settings = omit(['fileIcons'], appSettings) 
            window.f5.write(
                createURI(LocalFileSystemID, settings.settings),
                JSON.stringify( mergeRight(settings, { mode, theme, fileTheme, timeFmt, sizeFmt }) )
            )
        }
    }
    
    return shown && <Modal buttons={buttons} onClose={onClose} options={{x: true}}>
        <form className={styles.form} onSubmit={e => e.preventDefault()}>
            <label>Mode:</label>
            <div className="dry-buttons">
                <button onClick={() => setMode('light')}  data-checked={mode=='light'}>Light</button>
                <button onClick={() => setMode('system')} data-checked={mode=='system'}>System</button>
                <button onClick={() => setMode('dark')}   data-checked={mode=='dark'}>Dark</button>
            </div>

            <label>Color Theme:</label>
            <div className={styles.themes}>
                {themes.map(t => 
                    <span key={t}
                        data-mode="dark"
                        data-theme={t}
                        data-active={t==theme} 
                        onClick={() => setTheme(t)}
                    ></span>
                )}
            </div>

            <label>File Icon Theme:</label>
            <Select value={fileTheme} options={fileIconThemes} onChange={setFileTheme} />

            <label>Date/time format:</label>
            <input className={classNames('dry')} 
                name="date-time-fmt"
                value={timeFmt}
                onChange={e => setTimeFmt(e.target.value)}
                placeholder="e.g. yyyy-MM-dd HH:mm" 
            />
            <p>
                <i className="icon">info</i><a href="https://date-fns.org/v3.6.0/docs/format" target="_blank">See all formats</a>
            </p>

            <label>Filesize format:</label>
            <input className={classNames('dry')} 
                name="filesize-fmt"
                value={sizeFmt}
                onChange={e => setSizeFmt(e.target.value)}
                placeholder="e.g. 0.0 b" 
            />
            <p>
                <i className="icon">info</i><a href="http://numeraljs.com/#format-bytes" target="_blank">See all formats</a>
            </p>
        </form>
    </Modal>
}