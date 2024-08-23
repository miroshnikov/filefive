import React, { useRef, useState, useEffect } from "react"
import styles from './Toolbar.less'

export interface ToolbarItem {
    id: string
    icon: string
    disabled: boolean
    onClick: () => void
}

export default function Toolbar({items}: {items: ToolbarItem[]}) {
    return <div className={styles.root}>
        {items.map(item => 
            <button key={item.id}
                className="icon" 
                disabled={item.disabled}
                onClick={() => item.onClick()}
            >{item.icon}</button>
        )}
    </div>
}
