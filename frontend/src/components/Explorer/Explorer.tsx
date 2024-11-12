import React, { useState, useEffect, useRef, useMemo, useContext, useCallback } from "react"
import classNames from 'classnames'
import { AppSettingsContext } from '../../context/config'
import { 
    ConnectionID, 
    URI, 
    FileInfo, 
    Files, 
    Path, 
    SortOrder, 
    ExplorerSettings, 
    LocalFileSystemID,
    FilterSettings
} from '../../../../src/types'
import { parseURI, createURI } from '../../../../src/utils/URI'
import { dirname, descendantOf, join, basename } from '../../utils/path'
import styles from './Explorer.less'
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs"
import Filter, { filterRegExp } from '../Filter/Filter'
import List, { Column, Columns, ColumnType, Item } from '../List/List'
import Toolbar, { ToolbarItem } from '../Toolbar/Toolbar'
import { dir$ } from '../../observables/dir'
import { filter, tap } from 'rxjs/operators'
import { useEffectOnUpdate, useSubscribe, useCustomCompareEffect } from '../../hooks'
import { 
    sortWith, 
    descend, 
    ascend, 
    prop, 
    without, 
    pick, 
    pipe, 
    omit, 
    keys, 
    reduce, 
    insertAll, 
    sortBy, 
    length, 
    curry, 
    whereEq, 
    takeLast,
    equals,
    adjust,
    sort
} from 'ramda'
import numeral from 'numeral'
import { DropEffect } from '../List/List'
import { Menu, MenuItem, ContextMenu, Tooltips } from '../../ui/components'
import { format } from 'date-fns'
import { t } from 'i18next'
import { command$ } from '../../observables/command'
import { CommandID } from '../../commands'


const createDragImage = (text: string) => {
    const dragImage = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    dragImage.setAttribute('class', 'drag-image')
    dragImage.setAttribute('viewBox', `0 0 ${text.length*15+10} 20`)
    dragImage.setAttribute('width', `${text.length*15+10}`)
    dragImage.setAttribute('height', '20')
    dragImage.innerHTML = `<text x=15 y=15>${text}</text>`
    document.body.appendChild(dragImage)
    return dragImage
}

const filterFiles = (files: Files, predicate: (f: FileInfo) => boolean) => {
    return files.filter(predicate)
}

const sortFiles = (files: Files, columns: Columns) => {
    const sortings = [descend<FileInfo>(prop('dir'))]
    const sortedBy = columns.find(({sort}) => !!sort)
    if (sortedBy) {
        const getLowerName = pipe(prop(sortedBy.name), v => typeof v === 'string' ? v.toLowerCase() : v)
        sortings.push(sortedBy.sort == SortOrder.Asc ? 
            ascend(getLowerName) : 
            descend(getLowerName)
        )
    }
    return sortWith(sortings, files)
}

const rightsToStr = (n: number) =>
    n.toString(8).split('').map(s => parseInt(s)).reverse().slice(0, 3).reduce(
        (rights, n) => [...rights, (n & 4 ? 'r':'-') + (n & 2 ? 'w':'-') + (n & 1 ? 'x':'-')], []
    ).reverse().join('')


const toColumns = curry((columns: Columns, formatters: {[key: keyof FileInfo]: (value: FileInfo[string]) => string}, files: Files) => {
    return files.map(file => ({
        ...pick(['URI', 'path', 'dir'], file),
        ...{ rawSize: file.size },
        ...columns.reduce((props, {name}) => ({...props, 
            [name]: new String(name=='size' && file.dir ? '' : name in formatters ? formatters[name](file[name]) : file[name])
        }), {})
    }))
})

const onlyVisible = (dirs: string[]) => {
    const visible = new Set([ dirs.sort(ascend(prop('length'))).shift() ])
    dirs.forEach(dir => visible.has(dirname(dir)) && visible.add(dir))
    return Array.from(visible.values())
}


const HISTORY_SIZE = 5


interface ExplorerProps {
    icon: string
    connection: ConnectionID
    connectionName?: string
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
    onFocus?: () => void
    onBlur?: () => void
    contextMenu?: MenuItem[]
    onNewFile?: (uri: URI) => void
}


export default function Explorer ({
    icon, 
    connection, 
    connectionName,
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

    const [showFilter, setShowFilter] = useState(false)
    const filterSettings = useRef<FilterSettings>(null)
    const filterRe = useRef<RegExp>(null)

    const history = useRef<Path[]>([])
    const historyIndex = useRef(0)
    const goHistory = useRef(-1)
    const [isFirst, setIsFirst] = useState(true)
    const [isLast, setIsLast] = useState(true)
    
    const expanded = useRef<string[]>([])

    const list = useRef(null)

    const [showColumnsMenu, setShowColumnsMenu] = useState(false)

    useCustomCompareEffect(() => {
        setColumns(
            settings.columns.filter(({visible, name}) => visible == true || name == 'name').map(c => ({
                name: c.name,
                type: c.type == 'number' ? ColumnType.Number : ColumnType.String,
                title: c.title,
                width: c.width,
                sort: settings.sort[0] == c.name ? settings.sort[1] : undefined
            }))
        )

        if (settings.filter) {
            filterSettings.current = settings.filter
            setShowFilter(true)
        }
    }, [settings], equals)

    useEffectOnUpdate(() => setRoot(path), [path])
    
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

    useEffectOnUpdate(() => {
        onChange(root)

        if (goHistory.current >= 0) {
            historyIndex.current = goHistory.current
        } else {
            if (root != history.current[history.current.length-1]) {
                history.current = takeLast(HISTORY_SIZE, [...history.current, root])
            }
            historyIndex.current = history.current.length - 1
            onSettingsChange?.({history: history.current})
        }
        goHistory.current = -1
        setIsFirst(historyIndex.current == 0)
        setIsLast(historyIndex.current == history.current.length - 1)

        // console.log(history.current, historyIndex.current)
    }, [root])

    useCustomCompareEffect(() => {
        history.current = settings.history
        historyIndex.current = Math.max(history.current.length-1, 0)
    }, [settings], equals)

    const formatters = {
        modified: (value: Date) => format(value, appSettings.timeFmt),
        size: (value: number) => numeral(value).format(appSettings.sizeFmt),
        rights: (value: number|string) => typeof value == 'number' ? rightsToStr(value) : value
    }

    const filterPredicate = (file: FileInfo) => {
        if (file.dir) {
            return true
        }
        if (filterRe.current) {
            const found = filterRe.current.exec(file.name)
            return filterSettings.current?.invert ?? false ? found === null : found !== null
        }
        return true
    }

    const update = useCallback(() => {
        folders.current = pick(watched.current, folders.current)
        setFiles(
            pipe(
                omit([root]),
                keys,
                sortBy(length),
                reduce((files, dir) => {
                    const i = files.findIndex(({path}) => path == dir)
                    return i >= 0 ? insertAll(i+1, sortFiles(filterFiles(folders.current[dir], filterPredicate), columns), files) : files
                }, sortFiles(filterFiles(folders.current[root] ?? [], filterPredicate), columns)),
                toColumns(columns, formatters),
            )(folders.current)
        )
    }, [root, columns, filterSettings])

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
        [update]
    )

    useEffectOnUpdate(() => {
        update()
    }, [columns])


    const setFilterSettings = (filter: FilterSettings) => {
        filterRe.current = filter ? filterRegExp(filter) : null
        update()
        if (!equals(filter, settings.filter)) {
            onSettingsChange?.({filter})
        }
    } 
    useEffectOnUpdate(() => {
        setFilterSettings(showFilter ? filterSettings.current : null)
    }, [showFilter])
    

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

    useEffect(() => {
        return () => onBlur()
    }, [])

    useSubscribe(() => 
        command$.pipe(filter(() => focused)).subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.Copy: {
                    const uris = selected.current?.map(path => createURI(connection, path))
                    if (uris.length) {
                        cmd.e.preventDefault()
                        cmd.e.clipboardData.setData('URIs', JSON.stringify(uris))
                    }
                    break
                }
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
                case CommandID.CopyURI : {
                    const uri = cmd.uri ?? (target.current ? createURI(connection, target.current) : null)
                    if (uri) {
                        const uris = selected.current?.map(path => createURI(connection, path))
                        navigator.clipboard.writeText((uris.includes(uri) ? uris : [uri]).join(' '))
                    }
                    break
                }
                case CommandID.CopyPath: {
                    const path = cmd.uri ? parseURI(cmd.uri).path : target.current
                    if (path) {
                        navigator.clipboard.writeText((selected.current?.includes(path) ? selected.current : [path]).join(' '))
                    }
                    break
                }
                case CommandID.CopyRelativePath: {
                    const path = cmd.uri ? parseURI(cmd.uri).path : target.current
                    if (path) {
                        navigator.clipboard.writeText(
                            (selected.current?.includes(path) ? selected.current : [path])
                                .map(path => path.substring(root.length+1))
                                .join(' ')
                        )
                    }
                    break
                }
                case CommandID.CopyName: {
                    const path = cmd.uri ? parseURI(cmd.uri).path : target.current
                    if (path) {
                        navigator.clipboard.writeText(
                            (selected.current.includes(path) ? selected.current : [path])
                                .map(path => basename(path))
                                .join(' ')
                        )
                    }
                    break
                }
                case CommandID.CopyNameNoExt: {
                    const path = cmd.uri ? parseURI(cmd.uri).path : target.current
                    if (path) {
                        navigator.clipboard.writeText(
                            (selected.current.includes(path) ? selected.current : [path])
                                .map(path => {
                                    const name = basename(path)
                                    const dot = name.lastIndexOf('.')
                                    return name.substring(0, dot > 0 ? dot : name.length)
                                })
                                .join(' ')
                        )
                    }
                    break
                }
                case CommandID.ShowFilter: {
                    setShowFilter(showFilter => !showFilter)
                    break
                }
                case CommandID.GoBack: {
                    setRoot(history.current[goHistory.current = Math.max(historyIndex.current-1, 0)])
                    break
                }
                case CommandID.GoForward: {
                    setRoot(history.current[Math.min(goHistory.current = historyIndex.current+1, history.current.length-1)])
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

    const onDragStart = (dragged: URI[], e: React.DragEvent<HTMLElement>) => {
        e.dataTransfer.effectAllowed = 'copyMove'
        e.dataTransfer.setData('URIs', JSON.stringify(dragged))   //"text/uri-list" format only allows one URI
        e.dataTransfer.items.add('source', connection)
        const caption = dragged.length == 1 ? basename(parseURI(dragged[0]).path) : ''+dragged.length
        const dragImage = createDragImage(caption)
        e.dataTransfer.setDragImage(dragImage, 0, 0)
        setTimeout(() => document.body.removeChild(dragImage), 0)
    }

    const onDragEnd = (e: React.DragEvent<HTMLElement>) => {
        e.dataTransfer.clearData()
        e.dataTransfer.items.clear()
    }

    const onDragOver = (e: React.DragEvent<HTMLElement>) => {
        // The data store is in protected mode, hence the dataTransfer is not available for security reasons.
        e.preventDefault()
        const sameSource = e.dataTransfer.types.includes(connection)
        e.dataTransfer.dropEffect = sameSource ? (e.altKey ? 'copy' : 'move') : 'copy'
    }

    const onDrop = (items: string[]|File[], target: Path, effect: DropEffect) => {
        console.log(effect, items, '->', connection+target)
        if (items.length) {
            typeof items[0] == 'string' ? 
                window.f5.copy(items as URI[], createURI(connection, target), effect == DropEffect.Move) :
                uploadFiles(items as File[], target)
        }
    }

    const sortByColumn = (name: Column['name']) => {
        const toSort = columns.find(whereEq({name}))
        toSort.sort = toSort.sort === SortOrder.Asc ? SortOrder.Desc : SortOrder.Asc
        setColumns(columns.map(c => c.name == name ? c : omit(['sort'], c)))
        onSettingsChange?.({ sort: [name, toSort.sort] })
    }

    const columnsMenu = useMemo<MenuItem[]>(() => 
        settings.columns.slice(1).map((c, i) => ({
            id: c.name,
            label: c.title,
            checked: c.visible,
            click: () => {
                onSettingsChange?.({
                    columns: adjust(i+1, c => ({...c, visible: !c.visible}), settings.columns)
                })
                return false
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
            columns: 
                sort(
                    ({name: a}, {name: b}) => columns.findIndex(whereEq({name: a})) - columns.findIndex(whereEq({name: b})), 
                    settings.columns
                )
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

    return <div 
            className={classNames(styles.root, {focused})} 
            onFocus={() => {setFocused(true); onFocus?.()}} 
            onBlur={() => {setFocused(false); onBlur?.()}}
        >
        <header>
            {toolbar.length ? 
                <Toolbar items={toolbar} onClick={() => list.current?.focus()} /> : 
                null 
            }
            <div className="path">
                <Tooltips shortcuts={appSettings.keybindings}>
                    <button className="icon" disabled={isFirst} data-command={CommandID.GoBack} data-tooltip="Go Back"
                        onClick={() => command$.next({id: CommandID.GoBack})}
                    >arrow_back</button>
                    <button className="icon" disabled={isLast} data-command={CommandID.GoForward} data-tooltip="Go Forward"
                        onClick={() => command$.next({id: CommandID.GoForward})}
                    >arrow_forward</button>
                    {connection != LocalFileSystemID &&
                        <button className="icon" data-command="refresh" data-tooltip="Refresh"
                            onClick={() => command$.next({id: CommandID.Refresh})}
                        >refresh</button>
                    }
                </Tooltips>
                <Breadcrumbs 
                    icon={icon}
                    path={root}
                    root={fixedRoot}
                    go={setRoot}
                    connection={connectionName ? { id: connection, name: connectionName } : null}
                />
            </div>
        </header>
        {showFilter && 
            <Filter 
                value={filterSettings.current}
                onChange={settings => setFilterSettings(filterSettings.current = settings)}
                onClose={() => setShowFilter(false)}
            />
        }
        <List 
            ref={list}
            columns={columns}
            files={files} 
            onGo={setRoot}
            onToggle={toggle}
            onSelect={(paths, t) => { onSelect(selected.current = paths); target.current = t }}
            onOpen={onOpen}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onMenu={(path, dir) => {setShowColumnsMenu(false); onMenu(createURI(connection, path), dir)}}
            onNew={createNew}
            onRename={(path, name) => window.f5.rename(path, name)}
            onSort={sortByColumn}
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
