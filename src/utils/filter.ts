import { FilterSettings } from '../types'

function escapeRegExp(s: string) {
    let re = s.replace(/[/\-\\^$+.()|[\]{}]/g, '\\$&')
    re = re.replaceAll('*', '.*')
    re = re.replaceAll('?', '.{1}')
    return re
}

export function filterRegExp(settings: FilterSettings): RegExp|null {
    if (!settings.text.length) {
        return null
    }

    let source = settings.useRe ? settings.text : escapeRegExp(settings.text)
    if (settings.wholeWord) {
        source = `^${source}$`
    }
    try {
        return new RegExp(source, settings.matchCase ? '' : 'i')
    } catch(e) {
        return null
    }
}