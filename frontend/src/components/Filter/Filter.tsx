import React, { useState, useEffect, useRef } from "react"
import { useToggle } from '../../hooks'
import { Tooltips } from '../../ui/components'
import { FilterSettings } from '../../../../src/types'
import { useEffectOnUpdate } from '../../hooks'
import { filterRegExp } from '../../../../src/utils/filter'
import styles from './Filter.less'


interface FilterProps {
    value: FilterSettings|null
    onChange: (settings: FilterSettings|null) => void
    onClose: () => void
}

export default function Filter({ value, onChange, onClose }: FilterProps) {
    const input = useRef(null)
    const [placeholder, setPlaceholder] = useState('')
    const [error, setError] = useState(false)
    const [text, setText] = useState(value?.text ?? '')
    const [matchCase, toggleCase] = useToggle(value?.matchCase ?? false)
    const [wholeWord, toggleWholeWord] = useToggle(value?.wholeWord ?? false)
    const [useRe, toggleUseRe] = useToggle(value?.useRe ?? false)
    const [invert, toggleInvert] = useToggle(value?.invert ?? false)

    useEffect(() => input.current?.focus(), [])

    useEffect(() => {
        setPlaceholder(
            useRe ?
                'JavaScript RegExp e.g. \.(png|jpe?g|gif)$, image\d{1,2}\..*' :
                'Wildcards * and ? may be used, e.g. *.png, image-?.*'
        )
    }, [matchCase, wholeWord, useRe])

    useEffectOnUpdate(() => {
        input.current?.focus()
        onChange(text.length ? {text, matchCase, wholeWord, useRe, invert} : null)

        if (text.length) {
            const re = filterRegExp({text, matchCase, wholeWord, useRe, invert})
            setError(!re)
        } else {
            setError(false)
        }
    }, [text, matchCase, wholeWord, useRe, invert])

    return <div className={styles.root}>
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
}
