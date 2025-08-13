import { AppSettings } from '../../../src/types'
import { basename } from './path'
import { curry } from 'ramda'


function getLangId(languages: AppSettings['fileIcons']['languages'], path: string, name: string, ext: string) {
    let id =
        languages
            .find(({filenamePatterns}) => 
                (filenamePatterns ?? [])
                    .map(s => new RegExp(s.replace('**', '^.+').replace('*', '[^/]+')))
                    .find(p => path.match(p))
            )?.id ??
        languages.find(({filenames}) => (filenames ?? []).includes(name))?.id ??
        languages.find(({extensions}) => (extensions ?? []).includes('.'+ext))?.id
    if (ext && !id) {
        for (const parts = ext.split('.').slice(1); parts.length && !id; parts.shift()) {
            id = languages.find(({extensions}) => (extensions ?? []).includes('.'+parts.join('.')))?.id
        }
    }
    return id
}

const fileicon = curry((icons: AppSettings['fileIcons'], path: string, dir: boolean|null) => {
    path = path.toLocaleLowerCase()
    const name = basename(path)

    if (dir !== null) {
        return (
            (dir ? icons.folderNamesExpanded?.[name] : null) ?? 
            icons.folderNames?.[name] ?? 
            (dir ? icons.folderExpanded ?? icons.folder : icons.folder)
        )
    }

    const ext = name.match(/[^.]?\.(.+)$/)?.[1]

    const byExt = () => {
        let id = null
        for (const parts = ext.split('.'); parts.length && !id; parts.shift()) {
            id = icons.fileExtensions?.[parts.join('.')]
        }
        return id
    }

    return (
        icons.fileNames?.[name] ?? 
        (ext && byExt()) ??
        icons.languageIds[getLangId(icons.languages, path, name, ext)] ??
        icons.file
    )
})

export default fileicon