import React, { useRef, useState, useEffect } from "react"
import classNames from 'classnames'
import styles from './List.less'
import { FileInfo, URI } from '../../../../src/types'
import { without, whereEq, prop, propEq, pipe, findIndex, __, subtract, unary, includes, identity } from 'ramda'
import { depth, dirname } from '../../utils/path'
import { useSet, useKeyHold } from '../../hooks'


export enum ColumnType {
    String = 'string',
    Number = 'number'
}

export interface Column {
    name: string
    type: ColumnType
    title: string
}
export type Columns = Column[]

export type Item = Pick<FileInfo, 'URI'|'path'|'dir'|'name'> & {[key: Column['name']]: string}
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
const isChild = (path: string, parent: string) => path == parent || dirname(path) == parent


interface ListProps {
    columns: Columns
    items: Items
    onGo: (dir: string) => void
    onToggle: (dir: string) => void
    onSelect: (paths: string[]) => void
    onOpen: (path: string) => void
    onDrop(URIs: string[], target: string, effect: DropEffect): void
    onMenu(path: string): void
    root: string
    tabindex: number
    parent?: string,
}

export default function ({columns, items, onGo, onToggle, onSelect, onOpen, onDrop, onMenu, root, tabindex, parent}: ListProps) {
    const rootEl = useRef(null)

    const [expanded, setExpanded] = useState<string[]>([])
    const [rootDepth, setRootDepth] = useState(0)
    const [clicked, setClicked] = useState<Item>(null)
    const [selected, {has: isSelected, reset: setSelected, toggle: toggleSelected}] = useSet<string>([])
    const [target, setTarget] = useState<string>(null)
    const metaPressed = useKeyHold('Meta')
    const shiftPressed = useKeyHold('Shift')
    const [dragging, setDragging] = useState(false)
    const [dropTarget, setDropTarget] = useState<string>('')
    const [draggedOver, setDraggedOver] = useState(false)

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

    useEffect(() => {
        if (clicked) {
            const timeout = setTimeout((item => () => {
                item.dir && !metaPressed.current && !shiftPressed.current && toggle(item.path)
            })(clicked), 250)
            return () => clearTimeout(timeout)
        }
    }, [clicked])

    const doubleClick = (item: Item) => {
        setClicked(null)
        item.dir ? onGo(item.path) : onOpen(item.path)
    }

    const select = (path: string) => {
        if (shiftPressed.current && selected.length) {
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
        else if (metaPressed.current) {
            console.log('toggle selected because meta is Pressed')
            toggleSelected(path)
        } else {
            setSelected([path])
        }
    }

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

        if (!URIs.map(URI => items.find(whereEq({URI}))).filter(identity).some(({path}) => isChild(path, targetDir))) {
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
        ref={rootEl}
        onContextMenu={() => onMenu(root)}
        onDragOver={e => parent && e.preventDefault()}
        onDragEnter={() => setDraggedOver(true)}
        onDragLeave={() => setDraggedOver(false)}
        onDrop={e => dragDrop(root, e)}
        tabIndex={tabindex}
    >
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    {columns.map(({name, title}) =>
                        <th key={name}>{title}</th>
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
                        onContextMenu={e => {e.stopPropagation(); onMenu(parent)}}
                    >
                        <td colSpan={3}>..</td>
                    </tr>
                }
                {items.map((item, i) => 
                    <tr 
                        key={item.path} 
                        className={classNames({
                            selected: isSelected(item.path), 
                            dragover: dropTarget && isDescendant(item.path, dropTarget),
                            target: target == item.path
                        })}
                        onClick={() => {select(item.path); setClicked(item); setTarget(item.path)}}
                        onDoubleClick={() => doubleClick(item)}
                        onContextMenu={e => {e.stopPropagation(); setTarget(item.path); onMenu(item.path)}}
                        draggable={true}
                        onDragStart={e => dragStart(i, e)}
                        onDragEnd={e => dragEnd(e)}
                        onDragOver={e => dragOver(e)}
                        onDragEnter={e => dragEnter(item, e)}
                        onDragLeave={e => dragLeave(item, e)}
                        onDrop={e => dragDrop(item.dir ? item.path : dirname(item.path), e)}
                    >
                        <td 
                            className={classNames({d: item.dir})}
                            title={item.path}
                            data-depth={depth(item.path)-rootDepth}
                        >
                            <div className={classNames({expanded: expanded.includes(item.path)})}>
                                {item.dir && 
                                    <i className="icon">arrow_forward_ios</i>
                                }
                                <span>{item.name}</span>
                            </div>
                        </td>
                        {columns.map(({name, type}) =>
                            <td 
                                key={name} 
                                className={'type-'+type}
                            >{item[name]}</td>
                        )}
                        <td></td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
}
