import { createStore } from '../genericStore'
import { baseMarker } from './baseMarker'
import { bubble } from './bubble'
import { line } from './line'

export const markerStore = createStore(baseMarker, { bubble, line });
markerStore.getMarkerForEncoding = function(enc) {
    return this.getAll().find(marker => {
        return [...marker.encoding.values()].some(encoding => enc === encoding);
    }) || null;
}