import { ForwardedRef } from "react"

/**
 *
 * @example <div ref={setRef(rootEl, fwdRef)}></div>
 *  
*/
export default function <T>(...refs: ForwardedRef<T>[]) {
    return (instance: T|null) => {
        refs.forEach(ref => {
            if (typeof ref === 'function') {
                ref(instance)
            } else if (ref) {
                ref.current = instance
            }
        })
    }
}
