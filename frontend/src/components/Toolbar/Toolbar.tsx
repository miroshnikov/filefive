import React from "react"
import { Tooltips } from '../../ui/components/Tooltips/Tooltips'
import styles from './Toolbar.less'

export interface ToolbarItem {
    id: string
    icon: string
    title?: string
    disabled?: boolean
    onClick: () => void
}

export default function Toolbar({items, onClick}: {items: ToolbarItem[], onClick?: (id: ToolbarItem['id']) => void}) {
    return <Tooltips>
        <div className={styles.root}>
            {items.map(item => 
                <button key={item.id}
                    className="icon" 
                    disabled={item.disabled ?? false}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onClick?.(item.id); item.onClick() }}
                    data-tooltip={item.title}
                >{item.icon}</button>
            )}
        </div>
    </Tooltips>
}
