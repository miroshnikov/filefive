import React, { useContext, Fragment } from "react"
import { Tooltips, getTooltipShortcut } from '../../ui/components/Tooltips/Tooltips'
import styles from './Toolbar.less'
import { AppSettingsContext } from '../../context/config'


export interface ToolbarItem {
    id: string
    icon: string
    title?: string
    disabled?: boolean
    label?: string
    delimiter?: boolean
    onClick: () => void
}

export default function Toolbar({items, onClick}: {items: ToolbarItem[], onClick?: (id: ToolbarItem['id']) => void}) {
    const appSettings = useContext(AppSettingsContext)

    if (!appSettings) {
        return <></>
    }

    return (
        <Tooltips>
            <div className={styles.root}>
                {items.map(item => <Fragment key={item.id}>
                    <button
                        className="icon" 
                        disabled={item.disabled ?? false}
                        onClick={e => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            onClick?.(item.id); 
                            setTimeout(() => item.onClick(), 100) 
                        }}
                        data-tooltip={item.title + getTooltipShortcut(item.id, appSettings.keybindings)}
                    >{item.icon} {item.label && <span>{item.label}</span>}</button>
                    {item.delimiter && <i></i>}
                </Fragment>)}
            </div>
        </Tooltips>
    )
}
