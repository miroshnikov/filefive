import React, { useState, useEffect, useRef, useMemo } from "react"
import classNames from 'classnames'
import { ConnectionID, URI, FileInfo, Files, Path, ExplorerSettings, SortOrder } from '../../../../src/types'
import { parseURI, createURI } from '../../utils/URI'
import { dirname, descendantOf, join } from '../../utils/path'
import styles from './Explorer.less'
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs"
import List, { Column, Columns, ColumnType, Items } from '../List/List'
import Toolbar, { ToolbarItem } from '../Toolbar/Toolbar'
import { dir$ } from '../../observables/dir'
import { filter } from 'rxjs/operators'
import { useEffectOnUpdate } from '../../hooks'
import { sortWith, descend, ascend, prop, without, pick, pipe, omit, keys, reduce, insertAll, sortBy, length, curry, whereEq, assoc } from 'ramda'
import numeral from 'numeral'
import { DropEffect } from '../List/List'
import { Menu, MenuItem, ContextMenu } from '../../ui/components'
import { format } from 'date-fns'
 

const sortFiles = (files: Files, columns: Columns) => {
    const sortings = [descend<FileInfo>(prop('dir'))]
    const sortedBy = columns.find(({sort}) => !!sort)
    if (sortedBy) {
        sortings.push(sortedBy.sort == SortOrder.Asc ? ascend(prop(sortedBy.name)) : descend(prop(sortedBy.name)))
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
    const [columns, setColumns] = useState<Columns>([])
    const [root, setRoot] = useState<string>(path)
    const [parent, setParent] = useState<string>(null)
    const [files, setFiles] = useState<Items>([])
    const selected = useRef<string[]>([])
    const watched = useRef<string[]>([])
    const folders = useRef<Record<string, Files>>({})
    const [focused, setFocused] = useState(false)
    
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

    useEffect(() => {
        const subscription = dir$
            .pipe(
                filter(({dir}) => {
                    const { id, path } = parseURI(dir)
                    return connection == id && watched.current.includes(path)
                }),
            )
            .subscribe(({dir, files}) => {
                folders.current[parseURI(dir)['path']] = files
                update()
            })
        return () => subscription.unsubscribe()
    }, [root, columns]) 

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

    const onDrop = (URIs: string[], target: string, effect: DropEffect) => {
        console.log(effect, URIs, '->', connection+target)
        window.f5.copy(URIs as URI[], connection+target as URI)
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

    return <div className={classNames(styles.root, {focused})} onFocus={() => {setFocused(true); onFocus?.()}} onBlur={() => {setFocused(false); onBlur?.()}}>
        <header>
            {toolbar.length ? 
                <Toolbar items={toolbar} /> : 
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
            onSelect={paths => onSelect(selected.current = paths)}
            onOpen={onOpen}
            onDrop={onDrop}
            onMenu={(path, dir) => {setShowColumnsMenu(false); onMenu(createURI(connection, path), dir)}}
            onNew={createNew}
            onSort={sort}
            onColumnsMenu={() => setShowColumnsMenu(true)}
            onColumnsChange={onColumnsChange}
            root={root}
            tabindex={tabindex}
            parent={parent}
        />

        {list.current &&
            <ContextMenu target={list.current}>
                <Menu items={showColumnsMenu ? columnsMenu : contextMenu} />
            </ContextMenu>
        }
    </div>
}

