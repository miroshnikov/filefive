import React, { useRef, useState, useEffect, KeyboardEvent } from "react"
import styles from './EditFileName.less'
import classNames from 'classnames'
import { parse } from '../../utils/path'


interface Props {
    name: string
    sublings: string[]
    onOk: (name: string) => void
    onCancel: () => void
}

export default function ({name, sublings, onOk, onCancel}: Props) {
    const inputEl = useRef(null)
    const [newName, setNewName] = useState(name)
    const [error, setError] = useState(false)
    const done = useRef(false)

    useEffect(() => {
        inputEl.current?.focus()
        const woExt = parse(name).name
        inputEl.current?.setSelectionRange(0, woExt.length)
    }, [])

    const onChange = (name: string) => {
        setNewName(name)
        setError(sublings.includes(name))
    }

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key == 'Escape') {
            onCancel()
            return
        }
        if (e.key == 'Enter' && !error) {
            newName.length ? save(newName) : setError(true)
        }
    }

    const save = (name: string) => {
        done.current = true
        name = name.replace('/', '')    // TODO
        name.length && onOk(name)
    }
    
    return <input 
        ref={inputEl}
        className={classNames('dry', styles.root, { error })} 
        value={newName} 
        onChange={e => onChange(e.target.value)} 
        onBlur={() => !done.current && ((newName.length && !error) ? save(newName) : onCancel())}
        onKeyDown={onKey}
    />
}