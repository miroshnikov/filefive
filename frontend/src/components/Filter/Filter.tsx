import React, { useState, useEffect, useRef } from "react"
import { useToggle } from '../../hooks'
import { Tooltips } from '../../ui/components'
import styles from './Filter.less'


function escapeRegExp(s: string) {
    let re = s.replace(/[/\-\\^$+.()|[\]{}]/g, '\\$&')
    re = re.replaceAll('*', '.*')
    re = re.replaceAll('?', '.{1}')
    return re
}

export interface FilterSettings {
    text: string,
    matchCase?: boolean
    wholeWord?: boolean
    useRe?: boolean
    invert?: boolean
}

export function filterRegExp(settings: FilterSettings): RegExp|null {
    if (!settings.text.length) {
        return null
    }

    let source = settings.useRe ? settings.text : escapeRegExp(settings.text)
    if (settings.wholeWord) {
        source = `^${source}$`
    }
    try {
        return new RegExp(source, settings.matchCase ? '' : 'i')
    } catch(e) {
        return null
    }
}


interface FilterProps {
    show: boolean,
    onChange: (settings: FilterSettings|null) => void
    onClose: () => void
}

export default function Filter({ show, onChange, onClose }: FilterProps) {
    const input = useRef(null)
    const [placeholder, setPlaceholder] = useState('')
    const [error, setError] = useState(false)
    const [text, setText] = useState('')
    const [matchCase, toggleCase] = useToggle(false)
    const [wholeWord, toggleWholeWord] = useToggle(false)
    const [useRe, toggleUseRe] = useToggle(false)
    const [invert, toggleInvert] = useToggle(false)

    useEffect(() => {
        show && input.current?.focus()
        onChange(show ? {text, matchCase, wholeWord, useRe, invert} : null)
    }, [show])

    useEffect(() => {
        setPlaceholder(
            useRe ?
                'JavaScript RegExp e.g. \.(png|jpe?g|gif)$, image\d{1,2}\..*' :
                'Wildcards * and ? may be used, e.g. *.png, image-?.*'
        )
    }, [matchCase, wholeWord, useRe])

    useEffect(() => {
        input.current?.focus()
        onChange({text, matchCase, wholeWord, useRe, invert})
        if (text.length) {
            const re = filterRegExp({text, matchCase, wholeWord, useRe, invert})
            setError(!re)
        } else {
            setError(false)
        }

    }, [text, matchCase, wholeWord, useRe, invert])

    return (<>
        {show && <div className={styles.root}>
            <i className='icon'>filter_list</i>
            <div data-error={error}>
                <input 
                    ref={input} 
                    value={text}
                    placeholder={placeholder}
                    onChange={e => setText(e.target.value)} 
                    onKeyDown={({key}) => key =='Escape' && onClose()}
                    autoComplete="off"
                />
                <Tooltips>
                    <button data-on={matchCase} data-tooltip="Match Case" onClick={toggleCase}>Aa</button>
                    <button data-on={wholeWord} data-tooltip="Match Whole Word" onClick={toggleWholeWord}>ab</button>
                    <button data-on={useRe} data-tooltip="Use JavaScript Regular Expression" onClick={toggleUseRe}>.*</button>
                    <button data-on={invert} data-tooltip="Invert (Exclude Matched)" onClick={toggleInvert}>
                        <i className="icon">block</i>
                    </button>
                </Tooltips>
            </div>
            <button onClick={e => onClose()}>✕</button>
        </div>
    }</>)
}
