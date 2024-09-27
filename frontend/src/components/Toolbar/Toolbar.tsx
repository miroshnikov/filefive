import React, { useContext } from "react"
import { Tooltips, getTooltipShortcut } from '../../ui/components/Tooltips/Tooltips'
import styles from './Toolbar.less'
import { AppSettingsContext } from '../../context/config'


export interface ToolbarItem {
    id: string
    icon: string
    title?: string
    disabled?: boolean
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
                {items.map(item => 
                    <button key={item.id}
                        className="icon" 
                        disabled={item.disabled ?? false}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onClick?.(item.id); item.onClick() }}
                        data-tooltip={item.title + getTooltipShortcut(item.id, appSettings.keybindings)}
                    >{item.icon}</button>
                )}
            </div>
        </Tooltips>
    )
}
