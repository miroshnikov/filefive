import React, { useState, useEffect, useRef } from "react"
import { ConnectionID, URI, FileInfo, Files, Path } from '../../../../src/types'
import { parseURI, createURI } from '../../../../src/utils/URI'
import styles from './Explorer.less'
import Breadcrumbs from "../Breadcrumbs/Breadcrumbs"
import List, { Columns, ColumnType, Items } from '../List/List'
import Toolbar, { ToolbarItem } from '../Toolbar/Toolbar'
import { dir$ } from '../../observables/watch'
import { filter } from 'rxjs/operators'
import { useEffectOnUpdate } from '../../hooks'
import { sortWith, descend, ascend, prop, without, pick, pipe, omit, keys, reduce, insertAll, sortBy, length, curry } from 'ramda'
import { dirname, descendantOf, join } from '../../utils/path'
import numeral from 'numeral'
import { DateTime } from "luxon";
import { DropEffect } from '../List/List'
import { Menu, MenuItem, ContextMenu } from '../../ui/components'
 

const sortFiles = (files: Files) => {
    return sortWith([
        descend(prop('dir')),
        ascend(prop('name'))
    ], files)
}

const formatters: {[key: keyof FileInfo]: (value: FileInfo[string]) => any} = {
    modified: (value: Date) => DateTime.fromJSDate(value).toLocaleString({...DateTime.DATE_SHORT, ...DateTime.TIME_24_SIMPLE}),
    size: (value: number) => numeral(value).format('0.0 b')
}

const fmt = (name: keyof FileInfo, value: FileInfo[string], isDir: boolean) => 
    new String(name=='size' && isDir ? '' : name in formatters ? formatters[name](value) : '')


const toColumns = curry((columns: Columns, files: Files) => {
    return files.map(file => ({
        ...pick(['URI', 'path', 'name', 'dir'], file),
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
    path: Path
    fixedRoot: Path
    onChange: (dir: Path) => void
    onSelect: (paths: Path[]) => void
    onOpen: (path: Path) => void
    onMenu: (item: URI, dir: boolean) => void
    toolbar: ToolbarItem[]
    tabindex: number
    contextMenu?: MenuItem[]
}


export default function ({
    icon, 
    connection, 
    path, 
    fixedRoot, 
    onChange, 
    onSelect, 
    onOpen, 
    onMenu, 
    toolbar, 
    tabindex,
    contextMenu = []
}: ExplorerProps) {
    const [columns, setColumns] = useState<Columns>([
        {name: 'size', type: ColumnType.Number, title: 'Size'},
        {name: 'modified', type: ColumnType.String, title: 'Last Modified'}
    ])

    const [root, setRoot] = useState<string>(path)
    const [parent, setParent] = useState<string>(null)
    const [files, setFiles] = useState<Items>([])

    const selected = useRef<string[]>([])
    const watched = useRef<string[]>([])
    const folders = useRef<Record<string, Files>>({})
    
    const expanded = useRef<string[]>([])

    const contextMenuTarget = useRef(null)

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
                    return i >= 0 ? insertAll(i+1, sortFiles(folders.current[dir]), files) : files
                }, sortFiles(folders.current[root] ?? [])),
                toColumns(columns)
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
    }, [root]) 


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
        dir ?
            window.f5.mkdir(name, createURI(connection, parent)) :
            window.f5.write(createURI(connection, join(parent, name)), '')
    }

    const onDrop = (URIs: string[], target: string, effect: DropEffect) => {
        console.log(effect, URIs, '->', connection+target)
        window.f5.copy(URIs as URI[], connection+target as URI)
    }


    return <div className={styles.root}>
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
            ref={contextMenuTarget}
            columns={columns}
            files={files} 
            onGo={setRoot}
            onToggle={toggle}
            onSelect={paths => onSelect(selected.current = paths)}
            onOpen={onOpen}
            onDrop={onDrop}
            onMenu={(path, dir) => onMenu(connection + path as URI, dir)}
            onNew={createNew}
            root={root}
            tabindex={tabindex}
            parent={parent}
        />

        {contextMenuTarget.current &&
            <ContextMenu target={contextMenuTarget.current}>
                <Menu items={contextMenu} />
            </ContextMenu>
        }
    </div>
}
