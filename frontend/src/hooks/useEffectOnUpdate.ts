import { useEffect, useRef } from 'react'

export const useEffectOnUpdate: typeof useEffect = (callback, deps) => {
    const first = useRef(true)
    useEffect(() => {
        first.current ? first.current = false : callback()
    }, deps);   
}
