import React, { useState, useEffect, useRef } from "react"
import { Tooltips } from '../../ui/components'
import { FilterSettings } from '../../../../src/types'
import { filterRegExp } from '../../../../src/utils/filter'
import styles from './Filter.less'


interface FilterProps {
    show: boolean
    initial: FilterSettings|null
    onChange: (settings: FilterSettings|null) => void
    onClose: () => void
}

export default function Filter({ show, initial, onChange, onClose }: FilterProps) {
    const [value, setValue] = useState<FilterSettings>()
    const input = useRef(null)
    const [placeholder, setPlaceholder] = useState('')
    const [error, setError] = useState(false)

    useEffect(() => {
        setValue({
            text: initial?.text ?? '',
            matchCase: initial?.matchCase ?? false,
            wholeWord: initial?.wholeWord ?? false,
            useRe: initial?.useRe ?? false,
            invert: initial?.invert ?? false
        })
    }, [initial])

    useEffect(() => {
        if (show) {
            input.current?.focus()
            input.current?.select()
        }
    }, [show])

    useEffect(() => {
        setPlaceholder(
            value?.useRe ?
                'Filter using JavaScript RegExp, e.g. \.(png|jpe?g|gif)$, image\d{1,2}\..*' :
                'Filter using wildcards * and ?, e.g. *.png, image-?.*'
        )
    }, [value])

    const update = (settings: Partial<FilterSettings>) => {
        const newValue = {...value, ...settings}
        setValue(newValue)
        input.current?.focus()

        if (newValue.text.length) {
            const re = filterRegExp(newValue)
            setError(!re)
        } else {
            setError(false)
        }

        onChange(newValue)
    }

    return show && <div className={styles.root}>
        <i className='icon'>filter_alt</i>
        <div data-error={error}>
            <input 
                ref={input} 
                value={value.text}
                placeholder={placeholder}
                onChange={e => update({text: e.target.value})} 
                onKeyDown={({key}) => key =='Escape' && onClose()}
                autoComplete="off"
            />
            <Tooltips>
                <button data-on={value.matchCase} data-tooltip="Match Case" onClick={() => update({matchCase: !value.matchCase})}>Aa</button>
                <button data-on={value.wholeWord} data-tooltip="Match Whole Word" onClick={() => update({wholeWord: !value.wholeWord})}>ab</button>
                <button data-on={value.useRe} data-tooltip="Use JavaScript Regular Expression" onClick={() => update({useRe: !value.useRe})}>.*</button>
                <button data-on={value.invert} data-tooltip="Invert (Exclude Matched)" onClick={() => update({invert: !value.invert})}>
                    <i className="icon">block</i>
                </button>
            </Tooltips>
        </div>
        <button onClick={e => onClose()}>✕</button>
    </div>
}