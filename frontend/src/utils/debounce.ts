export default function debounce<T extends (...args: any) => any>(f: T, wait: number): (...args: any) => Promise<any> {   
    let timeout: ReturnType<typeof setTimeout>
    return async (...args: any) => {
        clearTimeout(timeout)
        return new Promise((resolve, reject) => {
            timeout = setTimeout(() => {
                try {
                    resolve(f(...args))
                } catch (e) {
                    reject(e)
                }
            }, wait)
        })
    }
}