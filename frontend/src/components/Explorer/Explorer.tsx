import React, { useState, useEffect, useRef, useMemo, useContext } from "react"
import classNames from 'classnames'
import { AppSettingsContext } from '../../context/config'
import { ConnectionID, URI, FileInfo, Files, Path, ExplorerSettings, SortOrder } from '../../../../src/types'
import { parseURI, createURI } from '../../../../src/utils/URI'
import { dirname, descendantOf, join, childOf } from '../../utils/path'
import styles from './Explorer.less'
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs"
import List, { Column, Columns, ColumnType, Item } from '../List/List'
import Toolbar, { ToolbarItem } from '../Toolbar/Toolbar'
import { dir$ } from '../../observables/dir'
import { filter, tap } from 'rxjs/operators'
import { useEffectOnUpdate, useSubscribe } from '../../hooks'
import { sortWith, descend, ascend, prop, without, pick, pipe, omit, keys, reduce, insertAll, sortBy, length, curry, whereEq, toLower, complement } from 'ramda'
import numeral from 'numeral'
import { DropEffect } from '../List/List'
import { Menu, MenuItem, ContextMenu } from '../../ui/components'
import { format } from 'date-fns'
import { t } from 'i18next'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'
 

const sortFiles = (files: Files, columns: Columns) => {
    const sortings = [descend<FileInfo>(prop('dir'))]
    const sortedBy = columns.find(({sort}) => !!sort)
    if (sortedBy) {
        const getLowerName = pipe(prop(sortedBy.name), toLower)
        sortings.push(sortedBy.sort == SortOrder.Asc ? 
            ascend(getLowerName) : 
            descend(getLowerName)
        )
    }
    return sortWith(sortings, files)
}

const formatters: {[key: keyof FileInfo]: (value: FileInfo[string]) => any} = {
    modified: (value: Date) => format(value, 'yyyy-MM-dd HH:mm'),       // https://date-fns.org/v3.6.0/docs/format
    size: (value: number) => numeral(value).format('0.0 b')
}

const fmt = (name: keyof FileInfo, value: FileInfo[string], isDir: boolean) => 
    new String(name=='size' && isDir ? '' : name in formatters ? formatters[name](value) : value)


const toColumns = curry((columns: Columns, files: Files) => {
    return files.map(file => ({
        ...pick(['URI', 'path', 'dir'], file),
        ...{ rawSize: file.size },
        ...columns.reduce((props, {name}) => ({...props, 
            [name]: fmt(name, file[name], file.dir)
        }), {})
    }))
})

const onlyVisible = (dirs: string[]) => {
    const visible = new Set([ dirs.sort(ascend(prop('length'))).shift() ])
    dirs.forEach(dir => visible.has(dirname(dir)) && visible.add(dir))
    return Array.from(visible.values())
}



interface ExplorerProps {
    icon: string
    connection: ConnectionID
    settings: ExplorerSettings
    path: Path
    fixedRoot: Path
    onChange: (dir: Path) => void
    onSelect: (paths: Path[]) => void
    onOpen: (path: Path) => void
    onMenu: (item: URI, dir: boolean) => void
    onSettingsChange?: (settings: Partial<ExplorerSettings>) => void
    toolbar: ToolbarItem[]
    tabindex: number
    onFocus?: () => {}
    onBlur?: () => {}
    contextMenu?: MenuItem[]
    onNewFile?: (uri: URI) => void
}


export default function Explorer ({
    icon, 
    connection, 
    settings,
    path, 
    fixedRoot, 
    onChange, 
    onSelect, 
    onOpen, 
    onMenu, 
    onSettingsChange,
    toolbar, 
    tabindex,
    onFocus,
    onBlur,
    contextMenu = [],
    onNewFile
}: ExplorerProps) {
    const appSettings = useContext(AppSettingsContext)

    const [columns, setColumns] = useState<Columns>([])
    const [root, setRoot] = useState<string>(path)
    const [parent, setParent] = useState<string>(null)
    const [files, setFiles] = useState<(Item & {rawSize: number})[]>([])
    const selected = useRef<string[]>([])
    const target = useRef<Path>(null)
    const watched = useRef<string[]>([])
    const folders = useRef<Record<string, Files>>({})
    const [focused, setFocused] = useState(false)
    const [stat, setStat] = useState({ files: 0, dirs: 0, size: 0 })
    
    const expanded = useRef<string[]>([])

    const list = useRef(null)

    const [showColumnsMenu, setShowColumnsMenu] = useState(false)

    useEffect(() => {
        setColumns(
            settings.columns.filter(({visible, name}) => visible == true || name == 'name').map(c => ({
                name: c.name,
                type: c.type == 'number' ? ColumnType.Number : ColumnType.String,
                title: c.title,
                width: c.width,
                sort: settings.sort[0] == c.name ? settings.sort[1] : undefined
            }))
        )
    }, [settings])

    useEffect(() => setRoot(path), [path])
    
    useEffect(() => {  
        setParent(root == '/' ? null : dirname(root))
        watch([root])       
        return () => { 
            unwatch(watched.current) 
            setFiles([])
            selected.current = []
            expanded.current = []
        }
    }, [root])

    useEffectOnUpdate(() => onChange(root), [root])

    const update = () => {
        folders.current = pick(watched.current, folders.current)
        setFiles(
            pipe(
                omit([root]),
                keys,
                sortBy(length),
                reduce((files, dir) => {
                    const i = files.findIndex(({path}) => path == dir)
                    return i >= 0 ? insertAll(i+1, sortFiles(folders.current[dir], columns), files) : files
                }, sortFiles(folders.current[root] ?? [], columns)),
                toColumns(columns),
            )(folders.current)
        )
    }

    useSubscribe(() => 
        dir$.pipe(
            filter(({dir}) => {
                const { id, path } = parseURI(dir)
                return connection == id && watched.current.includes(path)
            }),
        )
        .subscribe(({dir, files}) => {
            folders.current[parseURI(dir)['path']] = files
            update()
        }), 
        [root, columns]
    ) 

    useEffectOnUpdate(() => update(), [columns])

    useEffect(() => {
        const resizeList = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setTimeout(() => {
                    entry.target.scrollLeft = 0
                }, 200)
            }
        })
        list.current && resizeList.observe(list.current)
        return () => list.current && resizeList.unobserve(list.current)
    }, [])

    useSubscribe(() => 
        command$.pipe(filter(() => focused)).subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Paste: {
                    if (cmd.files) {
                        uploadFiles(cmd.files, target.current ?? root)
                    } else if (cmd.uris) {
                        if (!cmd.uris.length) {
                            return
                        }
                        window.f5.copy(cmd.uris, createURI(connection, target.current ?? root))
                    }
                    break
                }
                case CommandID.CopyToClipboard: {
                    const uris = selected.current?.map(path => createURI(connection, path))
                    uris && cmd.data.setData('URIs', JSON.stringify(uris))
                    break
                }
            }
        }), 
        [focused]
    )

    const watch = (dirs: string[]) => {
        watched.current.push(...dirs)
        dirs.forEach(dir => window.f5.watch(connection+dir as URI))
    }

    const unwatch = (dirs: string[]) => {
        watched.current = without(dirs, watched.current)
        update()
        dirs.forEach(dir => window.f5.unwatch(connection+dir as URI))
    }

    const toggle = (dir: string) => {
        if (expanded.current.includes(dir)) {
            unwatch(watched.current.filter(descendantOf(dir)))
            expanded.current = without([dir], expanded.current)
        } else {
            expanded.current.push(dir)
            watch(onlyVisible(expanded.current.filter(descendantOf(dir))))            
        }
    }

    const createNew = (name: string, parent: Path, dir: boolean) => {
        if (dir) {
            window.f5.mkdir(name, createURI(connection, parent))
        } else {
            const uri = createURI(connection, join(parent, name))
            onNewFile ? onNewFile(uri) : window.f5.write(uri, '')
        }   
    }

    const uploadFiles = (files: File[], target: Path) => {
        const data = new FormData()
        data.append('to', createURI(connection, target));
        files.forEach(async file => data.append('files', file))
        fetch('/api/upload', { method: 'POST', body: data })
    }

    const onDrop = (items: string[]|File[], target: Path, effect: DropEffect) => {
        console.log(effect, items, '->', connection+target)
        if (items.length) {
            typeof items[0] == 'string' ? 
                window.f5.copy(items as URI[], createURI(connection, target), effect == DropEffect.Move) :
                uploadFiles(items as File[], target)
        }
    }

    const sort = (name: Column['name']) => {
        const toSort = columns.find(whereEq({name}))
        toSort.sort = toSort.sort === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc
        setColumns(columns.map(c => c.name == name ? c : omit(['sort'], c)))
        onSettingsChange?.({ sort: [name, toSort.sort] })
    }

    const columnsMenu = useMemo<MenuItem[]>(() => 
        settings.columns.slice(1).map(c => ({
            id: c.name,
            label: c.title,
            checked: c.visible,
            click: () => {
                c.visible = !c.visible
                onSettingsChange?.({ columns: settings.columns })
            }
        })),
        [settings]
    )

    const onColumnsChange = (columns: {name: string, width: number}[]) => {
        columns.forEach(({name, width}) => {
            const c = settings.columns.find(whereEq({name}))
            c && (c.width = width)
        })
        onSettingsChange?.({ 
            columns: settings.columns.sort(({name: a}, {name: b}) => columns.findIndex(whereEq({name: a})) - columns.findIndex(whereEq({name: b})))
        })
    }

    useEffect(() => {
        setStat(
            selected.current?.length ?
                selected.current.reduce(
                    (stat, selected) => {
                        const file = files.find(({path}) => path == selected)
                        if (file) {
                            return { 
                                dirs: Number(stat.dirs + Number(file.dir)), 
                                files: stat.files + Number(!file.dir),
                                size: stat.size + (file.dir ? 0 : file.rawSize)
                            }
                        }
                        return stat
                    },
                    {files: 0, dirs: 0, size: 0}
                ) :
                files.reduce(
                    (stat, f) => ({ 
                        dirs: stat.dirs + Number(f.dir), 
                        files: stat.files + Number(!f.dir),
                        size: stat.size + (f.dir ? 0 : f.rawSize)
                    }), 
                    {files: 0, dirs: 0, size: 0}
                )
        )
    }, [files, selected.current])

    return <div className={classNames(styles.root, {focused})} onFocus={() => {setFocused(true); onFocus?.()}} onBlur={() => {setFocused(false); onBlur?.()}}>
        <header>
            {toolbar.length ? 
                <Toolbar items={toolbar} onClick={() => list.current?.focus()} /> : 
                null 
            }
            <Breadcrumbs 
                icon={icon}
                path={root}
                root={fixedRoot}
                go={setRoot}
            />
        </header>
        <List 
            ref={list}
            columns={columns}
            files={files} 
            onGo={setRoot}
            onToggle={toggle}
            onSelect={(paths, t) => { onSelect(selected.current = paths); target.current = t }}
            onOpen={onOpen}
            onDrop={onDrop}
            onMenu={(path, dir) => {setShowColumnsMenu(false); onMenu(createURI(connection, path), dir)}}
            onNew={createNew}
            onRename={(path, name) => window.f5.rename(path, name)}
            onSort={sort}
            onColumnsMenu={() => setShowColumnsMenu(true)}
            onColumnsChange={onColumnsChange}
            root={root}
            tabindex={tabindex}
            parent={parent}
        />
        <footer>
            {(stat.files || stat.dirs) ?  
                t('selected', {'count': selected.current?.length ?? 0 }) +
                t('stat', {files: stat.files, dirs: stat.dirs, joinArrays: (stat.files && stat.dirs) ? ', ' : ''}) + '. ' +
                t('size', {size: numeral(stat.size).format('0.0 b')}) : ''
            }
        </footer>
        {list.current &&
            <ContextMenu target={list.current}>
                <Menu items={showColumnsMenu ? columnsMenu : contextMenu} shortcuts={appSettings.keybindings} />
            </ContextMenu>
        }
    </div>
}

