import React, { useState, useEffect, useRef } from "react"
import { useToggle } from '../../hooks'
import { Tooltips } from '../../ui/components'
import styles from './Filter.less'

export function escapeRegExp(s: string) {
    let re = s.replace(/[/\-\\^$+.()|[\]{}]/g, '\\$&')
    re = re.replaceAll('*', '.*')
    re = re.replaceAll('?', '.{1}')
    return re
}


interface FilterProps {
    show: boolean,
    onChange: (re: RegExp) => void
    onClose: () => void
}

export default function Filter({ show, onChange, onClose }: FilterProps) {
    const input = useRef(null)
    const [placeholder, setPlaceholder] = useState('')
    const [text, setText] = useState('')
    const [matchCase, toggleCase] = useToggle(false)
    const [whole, toggleWhole] = useToggle(false)
    const [useRe, toggleUseRe] = useToggle(false)
    // TODO invert / exclude matched

    const send = () => {
        if (text.length) {
            let source = useRe ? text : escapeRegExp(text)
            if (whole) {
                source = `^${source}$`
            }
            try {
                onChange(new RegExp(source, matchCase ? '' : 'i'))
            } catch(e) {
                onChange(null)
            }
        } else {
            onChange(null)
        }
    }

    useEffect(() => {
        show && input.current?.focus()
        show ? send() : onChange(null)
    }, [show])

    useEffect(() => {
        setPlaceholder(
            useRe ?
                'JavaScript RegExp e.g. \.(png|jpe?g|gif)$, image\d{1,2}\..*' :
                'Wildcards * and ? may be used, e.g. *.png, image-?.*'
        )
    }, [matchCase, whole, useRe])

    useEffect(() => send(), [text, matchCase, whole, useRe])

    return (<>
        {show && <div className={styles.root}>
            <i className='icon'>filter_list</i>
            <div>
                <input 
                    ref={input} 
                    value={text}
                    placeholder={placeholder}
                    onChange={e => setText(e.target.value)} 
                    onKeyDown={({key}) => key =='Escape' && onClose()}
                    autoComplete="off"
                />
                <Tooltips>
                    <button data-on={matchCase} data-tooltip="Match Case" onClick={() => { toggleCase(); input.current?.focus()} }>Aa</button>
                    <button data-on={whole} data-tooltip="Match Whole Word" onClick={() => { toggleWhole(); input.current?.focus()} }>ab</button>
                    <button data-on={useRe} data-tooltip="Use JavaScript Regular Expression" onClick={() => { toggleUseRe(); input.current?.focus()} }>.*</button>
                </Tooltips>
            </div>
            <button onClick={e => onClose()}>✕</button>
        </div>
    }</>)
}