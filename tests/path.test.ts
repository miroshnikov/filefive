import { split } from '../src/utils/path'

describe('path', () => {
    test('split', async () => {
        expect(split('/a/b/c')).toEqual([
            'a','b','c'
        ]);
        expect(split('/')).toEqual([]);
        expect(split('/a/')).toEqual(['a']);
    })
})