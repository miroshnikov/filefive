import { useState } from 'react'

export const useSetAsSet = <T>(initial: T[] = []) => {
    const [entries, setEntries] = useState(new Set(initial))
    return [entries, {
        has: (v: T) => entries.has(v),
        add: (v: T) => setEntries(new Set(entries.add(v))),
        delete:  (v: T) => {
            const has = entries.delete(v)
            setEntries(new Set(entries))
            return has
        },
        clear: () => setEntries(new Set([])),
        reset: (v: T[]) => setEntries(new Set(v)),
        toggle: (v: T) => {
            entries.has(v) ? entries.delete(v) : entries.add(v)
            setEntries(new Set(entries))
        }
    }] as const
}
