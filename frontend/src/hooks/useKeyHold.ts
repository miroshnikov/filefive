import { useRef, useEffect, MutableRefObject } from 'react'
import { useEvent } from '.'


export const useKeyHold = (
    key: KeyboardEvent['key'],
    target: EventTarget = document, 
    deps: Parameters<typeof useEffect>[1] = []
): MutableRefObject<boolean> => {
    const pressed = useRef(false)
    useEvent(
        target, 
        'keydown', 
        (e: KeyboardEvent) => {e.key==key && (pressed.current = true)},
        deps
    )
    useEvent(
        target, 
        'keyup', 
        (e: KeyboardEvent) => { e.key==key && (pressed.current = false)},
        deps
    )
    return pressed
}
