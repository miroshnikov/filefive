import React, { useRef, useState, useEffect, forwardRef } from "react"
import classNames from 'classnames'
import styles from './List.less'
import { FileInfo, Path, FileState, SortOrder } from '../../../../src/types'
import { without, whereEq, prop, propEq, pipe, findIndex, __, subtract, unary, includes, identity, startsWith } from 'ramda'
import { filter } from 'rxjs/operators'
import { depth, dirname, parse, childOf } from '../../utils/path'
import { useSet, useSubscribe } from '../../hooks'
import setRef from '../../ui/setRef'
import { CommandID } from '../../commands'
import { command$ } from '../../observables/command'
import EditFileName from '../EditFileName/EditFileName'


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
    onSelect: (paths: string[]) => void
    onOpen: (path: string) => void
    onDrop: (URIs: string[], target: string, effect: DropEffect) => void
    onMenu: (path: string, dir: boolean) => void
    onNew: (name: string, parent: Path, dir: boolean) => void
    onSort?: (name: string) => void
    onColumnsMenu?: () => void
    root: string
    tabindex: number
    parent?: string,
}

export default forwardRef<HTMLDivElement, ListProps>(function List (
    {columns, files, onGo, onToggle, onSelect, onOpen, onDrop, onMenu, onNew, onSort, onColumnsMenu, root, tabindex, parent}, 
    fwdRef
) {
    const rootEl = useRef(null)

    const [items, setItems] = useState<Items>([])
    const [expanded, setExpanded] = useState<string[]>([])
    const [rootDepth, setRootDepth] = useState(0)
    const [clicked, setClicked] = useState<Item>(null)
    const [selected, {has: isSelected, reset: setSelected, toggle: toggleSelected}] = useSet<string>([])
    const [target, setTarget] = useState<Item>(null)

    const isActive = useRef(false)

    const [creating, createIn] = useState<{in: Path, dir: boolean}>()

    const [dragging, setDragging] = useState(false)
    const [dropTarget, setDropTarget] = useState<string>('')
    const [draggedOver, setDraggedOver] = useState(false)

    const insertNewItem = (items: Items) => {
        if (creating) {
            let i = items.findIndex(({path}) => path == creating.in)
            if (i < 0 && creating.in == root) {
                i = 0
            }
            const parent = items[i]
            if (i >= 0) {
                items.splice(creating.in == root ? 0 : i+1, 0, {
                    ...parent, 
                    dir: creating.dir,
                    FileStateAttr: FileState.Creating, 
                    name: '' 
                })
            }
            return [...items]
        }
        return items
    }

    useEffect(() => setItems(insertNewItem(files)), [files])

    useEffect(() => {        
        setItems(items => {
            items = items.filter(({FileStateAttr}) => FileStateAttr != FileState.Creating)
            if (creating && expanded.includes(creating.in)) {
                insertNewItem(items)
            }
            return items
        })
    }, [creating]);

    useEffect(() => {
        setSelected([])
        setExpanded([])
        rootEl.current.scrollTop = rootEl.current.scrollLeft = 0
    }, [parent])

    useEffect(() => {
        const first = items?.[0]
        setRootDepth(first ? depth(first.path) : 0)
    }, [items])

    useEffect(() => { onSelect(selected) }, [selected])

    useEffect(() => 
        setSelected(selected.filter(includes(__, items.map(prop('path'))))
    ), [items])

    const toggle = (dir: string) => {
        setExpanded(expanded.includes(dir) ? without([dir], expanded) : [...expanded, dir])
        onToggle(dir)
    }

    const click = (item: Item, meta: boolean, shift: boolean) => {
        select(item.path, meta, shift)
        setClicked(item) 
        setTarget(item)
        if (item.dir && !meta && !shift) {
            toggle(item.path)
        }
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
        setClicked(null)
        item.dir ? onGo(item.path) : onOpen(item.path)
    }

    useSubscribe(
        () => command$.pipe(filter(() => isActive.current)).subscribe(cmd => {
            switch (cmd) {
                case CommandID.NewDir: 
                case CommandID.NewFile: {
                    const inDir = target ? (dirOf(target, items) || root) : root
                    if (inDir) {
                        !expanded.includes(inDir) && toggle(inDir);
                        createIn({ in: inDir, dir: cmd == CommandID.NewDir })
                    }
                    break
                }
            }
        }),
        [target, items, expanded]
    )

  
    const dragStart = (i: number, e: React.DragEvent<HTMLTableRowElement>) => {
        setDragging(true)       //TODO make an array in useRef() of selected
        e.dataTransfer.effectAllowed = 'copyMove'
        const dragged = selected.includes(items[i].path) ? selected.map(path => items.find(whereEq({path})).URI) : [items[i].URI]
        e.dataTransfer.setData('URIs', JSON.stringify(dragged))   //"text/uri-list" format only allows one URI
        const dragImage = createDragImage(dragged.length == 1 ? items[i].name : ''+dragged.length)
        e.dataTransfer.setDragImage(dragImage, 0, 0)
        setTimeout(() => document.body.removeChild(dragImage), 0)
        // TODO window.electronAPI.startDrag(items[i].path)      // https://www.electronjs.org/docs/latest/tutorial/native-file-drag-drop
    }

    const dragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        setDragging(false)
        e.dataTransfer.clearData()
        e.dataTransfer.items.clear()
    }

    const dragCounter = useRef({path: '', count: 0, timeout: null})

    const dragEnter = (item: Item, e: React.DragEvent<HTMLTableRowElement>) => {
        const path = item.dir ? item.path : dirname(item.path)
        if (dragCounter.current.path == path) {
            dragCounter.current.count++
        } else {
            clearTimeout(dragCounter.current.timeout)
            dragCounter.current = {path, count: 1, timeout: expanded.includes(path) ? null : setTimeout(() => toggle(path), 800)}
            setDropTarget(path)
        }
    }

    const dragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault()
    }

    const dragLeave = (item: Item, e: React.DragEvent<HTMLTableRowElement>) => {
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

    const dragDrop = (targetDir: string, e: React.DragEvent<HTMLTableRowElement|HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
    
        const data = e.dataTransfer.getData('URIs')
        const URIs: string[] = data.length ? JSON.parse(data) : []
       
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i]
            item.kind == 'file' && URIs.push('file://'+(item.getAsFile() as any).path)  // dropped file from outside
        }

        if (!URIs.map(URI => items.find(whereEq({URI}))).filter(identity).some(({path}) => childOf(targetDir, path))) {
            onDrop(URIs, targetDir, e.dataTransfer.effectAllowed == 'copy' ? DropEffect.Copy : DropEffect.Move)           
        }

        e.dataTransfer.clearData()
        e.dataTransfer.items.clear()
        clearTimeout(dragCounter.current.timeout)
        dragCounter.current = {path: '', count: 0, timeout: null}
        setDropTarget('')
        setDragging(false)
        setDraggedOver(false)
    }

    return <div 
        className={classNames(styles.root, 'list', {draggedOver})} 
        ref={setRef(rootEl, fwdRef)}
        onFocus={() => isActive.current = true}
        onBlur={() => isActive.current = false}
        onContextMenu={() => onMenu(root, true)}
        onDragOver={e => parent && e.preventDefault()}
        onDragEnter={() => setDraggedOver(true)}
        onDragLeave={() => setDraggedOver(false)}
        onDrop={e => dragDrop(root, e)}
        tabIndex={tabindex}
    >
        <table>
            <thead>
                <tr onContextMenu={e => {e.stopPropagation(); onColumnsMenu?.(); console.log(e) }}>
                    {columns.map(({name, title, sort, width}) =>
                        <th key={name} 
                            onClick={() => onSort?.(name)} 
                            className={classNames({sorted: !!sort})}
                            style={{width}}
                        >
                            {title}
                            {sort && 
                                <span className="icon">
                                    {sort == SortOrder.Asc ? 'arrow_drop_up' : 'arrow_drop_down'}
                                </span>
                            }
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
                    item.FileStateAttr == FileState.Creating ?
                        <tr key='editing'>
                            <td 
                                colSpan={columns.length + 1}
                                className={classNames({d: item.dir})}
                                data-depth={depth(item.path)+1-rootDepth}
                            >
                                <EditFileName 
                                    name = {item.name}
                                    sublings = {selectChildren(creating?.in, files.map(prop('path')))}
                                    onOk = {nm => {onNew(nm, creating.in, creating.dir); createIn(undefined)}}
                                    onCancel={() => createIn(undefined)}
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
                            onDragEnd={e => dragEnd(e)}
                            onDragOver={e => dragOver(e)}
                            onDragEnter={e => dragEnter(item, e)}
                            onDragLeave={e => dragLeave(item, e)}
                            onDrop={e => dragDrop(item.dir ? item.path : dirname(item.path), e)}
                        >
                            {columns.map(({name, type}, i) =>
                                i == 0 ?
                                    <td key={name}
                                        className={classNames({d: item.dir})}
                                        title={item.path}
                                        data-depth={depth(item.path)-rootDepth}
                                    >
                                        <div className={classNames({expanded: expanded.includes(item.path)})}>
                                            {item.dir && 
                                                <i className="icon">arrow_forward_ios</i>
                                            }
                                            <span>{item[name]}</span>
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
    </div>
})
