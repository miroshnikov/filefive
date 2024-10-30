import React, { useState, useEffect, useRef } from "react"
import { useToggle } from '../../hooks'
import { Tooltips } from '../../ui/components'
import styles from './Filter.less'

export function escapeRegExp(s: string) {
    return s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
}


interface FilterProps {
    onChange: (re: RegExp) => void
    onClose: () => void
}

export default function Filter({ onChange, onClose }: FilterProps) {
    const input = useRef(null)
    const [text, setText] = useState('')
    const [placeholder, setPlaceholder] = useState('')
    const [matchCase, toggleCase] = useToggle(false)
    const [whole, toggleWhole] = useToggle(false)
    const [useRe, toggleUseRe] = useToggle(false)
    // exclude

    useEffect(() => input.current?.focus(), [])

    useEffect(() => {   // TODO
        // setPlaceholder('File name ' + (
        //     useRe ? `${whole ? 'matches RegExp' : 'has a substring that matches RegExp'}` :
        //     `${whole ? 'is equal to string' : 'contains substring'} ${matchCase ? 'matching case' : ''}`)
        // )
    }, [matchCase, whole])

    useEffect(() => {
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

    }, [text, matchCase, whole])

    return (
        <div className={styles.root}>
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
    )
}