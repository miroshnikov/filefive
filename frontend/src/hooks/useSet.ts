import { useState } from 'react'

export const useSet = <T>(initial: T[] = []) => {
    const [entries, setEntries] = useState(initial)
    return [entries, {
        has: (v: T) => entries.includes(v),
        add: (v: T) => setEntries(entries => entries.includes(v) ? entries : [...entries, v]),
        del: (v: T): boolean => {
            let found = false
            setEntries(entries => { 
                const i = entries.indexOf(v)
                if (i >= 0) {
                    entries.splice(i, 1)
                    found = true
                    return [...entries]
                }
                return entries
            })
            return found
        },
        clear: () => setEntries([]),
        reset: (v: T[]) => setEntries(v),
        toggle: (v: T): boolean => {
            let added = false
            setEntries(entries => { 
                const i = entries.indexOf(v)
                if (i >= 0) {
                    entries.splice(i, 1)
                    return entries
                } else {
                    added = true
                    return [...entries, v]
                }
            })
            return added
        }
    }] as const
}
