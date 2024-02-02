import { useEffect } from 'react'


export const useEvent = (
    target: EventTarget, 
    type: Parameters<EventTarget['addEventListener']>[0],
    listener: Parameters<EventTarget['addEventListener']>[1], 
    deps?: Parameters<typeof useEffect>[1]
) => {
    useEffect(() => {
        target.addEventListener(type, listener)
        return () => target.removeEventListener(type, listener)
    }, deps);   
}