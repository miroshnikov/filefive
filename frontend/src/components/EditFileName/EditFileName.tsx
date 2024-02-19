import React, { useRef, useState, useEffect } from "react"
import styles from './EditFileName.less'
import classNames from 'classnames'

interface Props {
    name: string
    onOk: (name: string) => void
    onCancel: () => void
}

export default function ({name, onOk, onCancel}: Props) {
    const inputEl = useRef(null)
    const [newName, setNewName] = useState(name)
    const [error, setError] = useState(false)
    useEffect(() => inputEl.current?.focus(), [])

    const onKey = (key: string) => {
        if (key == 'Escape') {
            onCancel()
            return
        }
        if (key == 'Enter' && !error) {
            newName.length ? onOk(newName) : setError(true)
        }
    }
    
    return <input 
        ref={inputEl}
        className={classNames(styles.root, { error })} 
        value={newName} 
        onChange={e => setNewName(e.target.value)} 
        onBlur={() => (newName.length && !error) ? onOk(name) : onCancel()}
        onKeyDown={({key}) => onKey(key)}
    />
}