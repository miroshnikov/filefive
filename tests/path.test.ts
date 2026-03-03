import { split, winToUnix, unixToWin } from '../src/utils/path'

describe('path', () => {
    test('split', () => {
        expect(split('/a/b/c')).toEqual([
            'a','b','c'
        ]);
        expect(split('/')).toEqual([]);
        expect(split('/a/')).toEqual(['a']);
    })

    test('winToUnix', () => {
        expect( winToUnix('C:\\Users\\Max') ).toBe('/C:/Users/Max')
        expect( winToUnix('C:\\Users\\Max\\') ).toBe('/C:/Users/Max/')
    })

    test('unixToWin', () => {
        expect( unixToWin('/C:/Users/Max') ).toBe('C:\\Users\\Max')
        expect( unixToWin('/C:/Users/Max/') ).toBe('C:\\Users\\Max\\')
        expect( unixToWin('C:') ).toBe('C:\\')
        expect( unixToWin('/') ).toBe('\\')
    })
})