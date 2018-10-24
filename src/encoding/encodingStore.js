import { createStore } from '../genericStore'
import { baseEncoding } from './baseEncoding'
import { frame } from './frame'
import { selection } from './selection'
import { order } from './order'
import { label } from './label'
import { color } from './color'

export const encodingStore = createStore(baseEncoding, {
    frame,
    selection,
    order,
    label,
    color
});