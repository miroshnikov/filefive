import { useState } from 'react'

export const useMap = <K, V>() => {
    const [map, setMap] = useState(new Map<K,V>())
    return [map, {
        has: (key: K) => map.has(key),
        set: (key: K, value: V) => setMap(map => new Map(map.set(key, value))),
        get: (key: K) => map.get(key),
        del: (key: K) => {
            let existed = false
            setMap(map => { existed = map.delete(key); return new Map(map) })
            return existed
        },
        clear: () => setMap(new Map<K,V>())
    }] as const
}
