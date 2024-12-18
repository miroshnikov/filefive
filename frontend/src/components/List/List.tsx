import React, { useRef, useState, useEffect, forwardRef, useCallback } from "react"
import classNames from 'classnames'
import styles from './List.less'
import { URI, FileInfo, Path, FileState, SortOrder } from '../../../../src/types'
import { without, whereEq, prop, propEq, pipe, findIndex, __, subtract, unary, includes, identity, startsWith, update, move } from 'ramda'
import { filter } from 'rxjs/operators'
import { depth, dirname, parse, childOf, join } from '../../utils/path'
import { useSet, useSubscribe, useEvent } from '../../hooks'
import setRef from '../../ui/setRef'
import { CommandID } from '../../commands'
import { command$ } from '../../observables/command'
import EditFileName from '../EditFileName/EditFileName'
import debounce from '../../utils/debounce'
import { Tooltips } from '../../ui/components'


export enum ColumnType {
    String = 'string',
    Number = 'number'
}

export interface Column {
    name: string
    type: ColumnType
    title: string
    sort?: SortOrder
    width: number
}
export type Columns = Column[]

export type Item = FileInfo
export type Items = Item[]

export enum DropEffect {
    Copy = 'copy',
    Move = 'move'
}

const isDescendant = (path: string, ancestor: string) => path.startsWith(ancestor+'/') || path == ancestor
const dirOf = (item: Item, all: Items) => item.dir ? item.path : all.find(({path}) => path == dirname(item.path))?.path

const selectChildren = (parent: Path, list: Path[]) => 
    list.filter(startsWith(parent+'/'))
        .map(path => path.substring(parent.length+1))
        .map(path => parse(path)['top'])



interface ListProps {
    columns: Columns
    files: Items
    onGo: (dir: string) => void
    onToggle: (dir: string) => void
    onSelect: (paths: string[], target: Path|null) => void
    onOpen: (path: string) => void
    onDragStart?: (dragged: URI[], e: React.DragEvent<HTMLElement>) => void
    onDragEnd?: (e: React.DragEvent<HTMLElement>) => void
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void
    onDrop: (URIs: string[]|File[], target: string, effect: DropEffect, e: React.DragEvent<HTMLElement>) => void
    onMenu: (path: string, dir: boolean) => void
    onNew?: (name: string, parent: Path, dir: boolean) => void
    onRename?: (uri: URI, name: string) => void
    onSort?: (name: string) => void
    onColumnsMenu?: () => void
    onColumnsChange?: (columns: {name: string, width: number}[]) => void
    root: string
    tabindex: number
    parent?: string,
    children?: JSX.Element
}

export default forwardRef<HTMLDivElement, ListProps>(function List ({
        columns, 
        files, 
        onGo, 
        onToggle, 
        onSelect, 
        onOpen, 
        onDragStart, 
        onDragEnd, 
        onDragOver, 
        onDrop,
        onMenu, 
        onNew, 
        onRename, 
        onSort, 
        onColumnsMenu, 
        onColumnsChange, 
        root, 
        tabindex, 
        parent,
        children
    }, 
    fwdRef
) {
    const rootEl = useRef(null)

    const [items, setItems] = useState<Items>([])
    const [expanded, setExpanded] = useState<string[]>([])
    const [rootDepth, setRootDepth] = useState(0)
    const [selected, {has: isSelected, reset: setSelected, toggle: toggleSelected}] = useSet<string>([])
    const [target, setTarget] = useState<Item>(null)

    const isActive = useRef(false)

    const waitForSecondClick = useRef<ReturnType<typeof setTimeout>>(null)

    const [creating, createIn] = useState<{in: Path, dir: boolean}>(null)
    const [renaming, rename] = useState<URI>(null)

    const [dropTarget, setDropTarget] = useState<string>('')
    const [draggedOver, setDraggedOver] = useState(false)

    const insertNewItem = (items: Items) => {
        if (creating) {
            let i = items.findIndex(({path}) => path == creating.in)
            if (i < 0 && creating.in == root) {
                i = 0
            }
            if (i < 0) {
                return
            }
            const newItem = {
                URI: '' as URI,
                path: items[i]?.path ?? join(root, 'new'),
                name: '',
                dir: creating.dir,
                size: 0,
                modified: new Date(),
                FileStateAttr: FileState.Creating
            }
            items.splice(creating.in == root ? 0 : i+1, 0, newItem)
            return [...items]
        }
        return items
    }


    const setRenamingItem = (items: Items) => {
        if (renaming) {
            const item = items.find(whereEq({URI: renaming}))
            item && (item.FileStateAttr = FileState.Renaming)
            return [...items]
        }
        return items
    }

    useEffect(() => {
        setItems(setRenamingItem(insertNewItem(files)))
    }, [files])

    useEffect(() => {
        setItems(items => {
            items = items.filter(({FileStateAttr}) => FileStateAttr != FileState.Creating)
            if (creating && expanded.includes(creating.in)) {
                return insertNewItem(items)
            }
            return items
        })
    }, [creating])

    useEffect(() => {
        setItems(items =>
            items.map(item => ({...item, FileStateAttr: item.URI == renaming ? FileState.Renaming : null }))
        )
    }, [renaming])

    useEffect(() => {
        setSelected([])
        setExpanded([])
        rootEl.current.scrollTop = rootEl.current.scrollLeft = 0
    }, [parent])

    useEffect(() => {
        const first = items?.[0]
        setRootDepth(first ? depth(first.path) : 0)
    }, [items])

    useEffect(() => { 
        onSelect(selected, target?.path) 
    }, [selected, target])

    useEffect(() => 
        setSelected(selected.filter(includes(__, items.map(prop('path'))))
    ), [items])

    const [widths, setWidths] = useState([]) 
    useEffect(
        () => { setWidths(columns.map(prop('width'))) }, 
        [columns]
    )

    const toggle = (dir: string) => {
        setExpanded(expanded.includes(dir) ? without([dir], expanded) : [...expanded, dir])
        onToggle(dir)
    }

    const click = (item: Item, meta: boolean, shift: boolean) => {
        select(item.path, meta, shift)
        setTarget(item)

        clearTimeout(waitForSecondClick.current)
        waitForSecondClick.current = setTimeout(() => {
            if (item.dir && !meta && !shift) {
                toggle(item.path)
            }    
        }, 400)
    }

    const select = (path: string, meta: boolean, shift: boolean) => {
        if (shift && selected.length) {
            if (isSelected(path)) {
                // TODO remove selection ?
            } else {
                const targetIndex = items.findIndex(propEq('path', path))
                const dist = selected.map(
                    unary(pipe(
                        propEq('path'),
                        findIndex(__ as any, items) as unknown as (pred: (item: Item) => boolean) => number,
                        subtract(targetIndex),
                        Math.abs
                    ))
                )
                const closestIndex = items.findIndex(whereEq({path: selected[ dist.indexOf(Math.min(...dist)) ]}));
                (targetIndex > closestIndex ? 
                    items.slice(closestIndex+1, targetIndex+1) :  
                    items.slice(targetIndex, closestIndex)).forEach(({path}) => toggleSelected(path))              
            }
        }
        else if (meta) {
            toggleSelected(path)
        } else {
            setSelected([path])
        }
    }

    const doubleClick = (item: Item) => {
        clearTimeout(waitForSecondClick.current)
        item.dir ? onGo(item.path) : onOpen(item.path)
    }

    useSubscribe(
        () => command$.pipe(filter(() => isActive.current)).subscribe(cmd => {
            switch (cmd.id) {
                case CommandID.SelectAll: {
                    setSelected(items.map(prop('path')))
                    cmd.e?.preventDefault()
                    cmd.e?.stopPropagation()
                    break
                }
                case CommandID.CollapseAll: {
                    expanded.forEach(onToggle)
                    setExpanded([])
                    break
                }
                case CommandID.NewDir: 
                case CommandID.NewFile: {
                    const inDir = target ? (dirOf(target, items) || root) : root
                    if (inDir) {
                        !expanded.includes(inDir) && toggle(inDir);
                        createIn({ in: inDir, dir: cmd.id == CommandID.NewDir })
                    }
                    break
                }
                case CommandID.Rename: {
                    rename(cmd.uri ?? target.URI)
                    break
                }
            }
        }),
        [target, items, expanded]
    )
 
    const dragStart = (i: number, e: React.DragEvent<HTMLElement>) => {
        onDragStart?.(
            selected.includes(items[i].path) ? 
                selected.map(path => items.find(whereEq({path})).URI) : 
                [items[i].URI],
            e
        )
    }

    const dragCounter = useRef({path: '', count: 0, timeout: null})

    const dragEnter = (item: Item, e: React.DragEvent<HTMLElement>) => {
        const path = item.dir ? item.path : dirname(item.path)
        if (dragCounter.current.path == path) {
            dragCounter.current.count++
        } else {
            clearTimeout(dragCounter.current.timeout)
            dragCounter.current = {path, count: 1, timeout: expanded.includes(path) ? null : setTimeout(() => toggle(path), 800)}
            setDropTarget(path)
        }
    }

    const dragLeave = (item: Item, e: React.DragEvent<HTMLElement>) => {
        const path = item.dir ? item.path : dirname(item.path)
        if (dragCounter.current.path == path) {
            if (dragCounter.current.count > 1) {
                dragCounter.current.count--
            } else {
                clearTimeout(dragCounter.current.timeout)
                dragCounter.current = {path: '', count: 0, timeout: null}
                setDropTarget('')
            }
        }
    }

    const dragDrop = (targetDir: string, e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
        e.stopPropagation()
   
        let URIs: string[] = []
        const data = e.dataTransfer.getData('URIs')
        if (data && data.length) {
            URIs = JSON.parse(data)
        }

        if (URIs.length) {
            if (!URIs
                    .map(URI => items.find(whereEq({URI})))
                    .filter(identity)
                    .some(({path}) => childOf(targetDir, path))
            ) {
                onDrop(URIs, targetDir, e.altKey ? DropEffect.Copy : DropEffect.Move, e)           
            }
        } else if (e.dataTransfer.items.length) {               // dropped from outside
            const files: File[] = []
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                const item = e.dataTransfer.items[i]
                item.kind == 'file' && files.push(item.getAsFile())
            }
            files.length && onDrop(files, targetDir, DropEffect.Copy, e) 
        }

        e.dataTransfer.clearData()
        e.dataTransfer.items.clear()
        clearTimeout(dragCounter.current.timeout)
        dragCounter.current = { path: '', count: 0, timeout: null }

        setDropTarget('')
        setDraggedOver(false)
    }

    const resizing = useRef<number>(null)

    const delayedOnChange = useCallback(
        onColumnsChange ? debounce(onColumnsChange, 500) : () => {},
        [onColumnsChange]
    )

    useEvent(document, 'mousemove', ({pageX}: MouseEvent) => {
        if (resizing.current !== null && rootEl.current && columns.length) {
            const target = rootEl.current.querySelector(`th:nth-child(${resizing.current+1})`)
            if (target) {
                const width = Math.max(50, Math.round(pageX - (target as Element).getBoundingClientRect().left))
                if (widths[resizing.current] != width) {
                    setWidths(update(resizing.current, width, widths))
                    delayedOnChange(columns.map(({name}, i) => ({name, width: widths[i]})))
                }
            }
        }
    })

    const draggingColumn = useRef<number>(null)
    const [colDropTarget, setColDropTarget] = useState<number>(null)
    const onColumnDragOver = (target: number) => () => {
        if (draggingColumn.current && target != draggingColumn.current) {
            setColDropTarget(target)
        }
    }
    const onColumnDrop = (target: number) => () => {
        if (draggingColumn.current && target != draggingColumn.current) {
            const newWidths = move(draggingColumn.current, target == widths.length-1 ? target : target+1, widths)
            onColumnsChange?.(
                move(draggingColumn.current, target == columns.length-1 ? target : target+1, columns)
                    .map(({name}, i) => ({name, width: newWidths[i]}))  
            )
        }
        setColDropTarget(null)
    }

    useEvent(document, 'mouseup', () => {
        resizing.current = draggingColumn.current = null
    })

    return (
            <div 
                className={classNames(styles.root, 'list', {draggedOver})} 
                ref={setRef(rootEl, fwdRef)}
                onFocus={() => isActive.current = true}
                onBlur={() => isActive.current = false}
                onClick={e => { if (e.target == rootEl.current) { setTarget(null); setSelected([]) }}}
                onContextMenu={() => {setTarget(null); onMenu(root, true)}}
                onDragOver={e => onDragOver?.(e)}
                onDragEnter={() => setDraggedOver(true)}
                onDragLeave={() => setDraggedOver(false)}
                onDrop={e => dragDrop(root, e)}
                tabIndex={tabindex}
            >
                {items.length > 0 || !children ?
                    <Tooltips delay={800}>
                    <table>
                        <thead>
                            <tr onContextMenu={e => {e.stopPropagation(); onColumnsMenu?.()}}>
                                {columns.map(({name, title, sort}, i) =>
                                    <th key={name} 
                                        className={classNames({sorted: !!sort, drop: i===colDropTarget})}
                                        style={{width: widths[i]}}
                                        data-name={name}
                                        onClick={() => onSort?.(name)}
                                        onMouseDown={() => i && (draggingColumn.current = i)}
                                        onMouseOver={onColumnDragOver(i)}
                                        onMouseOut={() => setColDropTarget(null)}
                                        onMouseUp={onColumnDrop(i)}
                                    >
                                        {title}
                                        {sort && 
                                            <span className="icon">
                                                {sort == SortOrder.Asc ? 'arrow_drop_up' : 'arrow_drop_down'}
                                            </span>
                                        }
                                        <i
                                            onMouseDown={e => {e.stopPropagation(); resizing.current = i}}
                                            onClick={e => e.stopPropagation()}
                                        ></i>
                                    </th>
                                )}
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {parent &&
                                <tr 
                                    key={parent} 
                                    className='up'
                                    onDoubleClick={() => onGo(parent)}
                                    onContextMenu={e => {e.stopPropagation(); onMenu(parent, true)}}
                                >
                                    <td colSpan={columns.length + 1}>..</td>
                                </tr>
                            }
                            {items.map((item, i) => 
                                item.FileStateAttr == FileState.Creating || item.FileStateAttr == FileState.Renaming ?
                                    <tr key='editing'>
                                        <td 
                                            colSpan={columns.length + 1}
                                            className={classNames({d: item.dir})}
                                            data-depth={depth(item.path)+1-rootDepth}
                                        >
                                            <EditFileName 
                                                name = {item.name}
                                                sublings = {selectChildren(creating?.in, files.map(prop('path')))}
                                                onOk = {nm => {
                                                    creating ? onNew?.(nm, creating.in, creating.dir) : onRename?.(renaming, nm)
                                                    createIn(null)
                                                    rename(null)
                                                }}
                                                onCancel={() => { createIn(null); rename(null) }}
                                            />
                                        </td>
                                        <td></td>
                                    </tr> :
                                    <tr 
                                        key={item.path} 
                                        className={classNames({
                                            selected: isSelected(item.path), 
                                            dragover: dropTarget && isDescendant(item.path, dropTarget),
                                            target: target?.path == item.path
                                        })}
                                        onClick={({metaKey, shiftKey}) => click(item, metaKey, shiftKey)}
                                        onDoubleClick={() => doubleClick(item)}
                                        onContextMenu={e => {e.stopPropagation(); setTarget(item); onMenu(item.path, item.dir)}}
                                        draggable={true}
                                        onDragStart={e => dragStart(i, e)}
                                        onDragEnd={e => onDragEnd?.(e)}
                                        onDragOver={e => onDragOver?.(e)}
                                        onDragEnter={e => dragEnter(item, e)}
                                        onDragLeave={e => dragLeave(item, e)}
                                        onDrop={e => dragDrop(item.dir ? item.path : dirname(item.path), e)}
                                    >
                                        {columns.map(({name, type}, i) =>
                                            i == 0 ?
                                                <td key={name}
                                                    className={classNames({d: item.dir})}
                                                    data-depth={depth(item.path)-rootDepth}
                                                >
                                                    <div className={classNames({expanded: expanded.includes(item.path)})}>
                                                        {item.dir && 
                                                            <i className="icon">arrow_forward_ios</i>
                                                        }
                                                        <span data-tooltip={item.path}>{item[name]}</span>
                                                        <ul>
                                                            {item.target &&
                                                                <li className="icon" data-tooltip={'Symbolic Link to ' + item.target}>prompt_suggestion</li>
                                                            }
                                                        </ul>
                                                    </div>
                                                </td> :
                                                <td key={name} className={'type-'+type}>
                                                    {item[name]}
                                                </td>
                                        )}
                                        <td></td>
                                    </tr>
                            )}
                        </tbody>
                    </table>
                    </Tooltips> : 
                    children 
                }
        </div> 
    )
})
