import { action, isObservableArray, toJS } from 'mobx';
import { isString, mapToObj, applyDefaults, deepmerge, arrayEquals } from './utils';
import { resolveRef } from './vizabi';

const defaultConfig = {
    markers: {},
    dimensions: {},
    permanent: {}
}

export function filter(config = {}, parent) {

    applyDefaults(config, defaultConfig);

    return {
        config,
        parent,
        get markers() {
            const cfg = resolveRef(this.config.markers);
            const markers = (isObservableArray(cfg)) ?
                cfg.map(m => [toJS(m), true]) :
                Object.entries(toJS(cfg));
            return new Map(markers);
        },
        get dimensions() {
            return toJS(this.config.dimensions);
        },
        setDimensions: action("setDimensions", function(dimensions) {
            this.config.dimensions = dimensions;
        }),
        get permanent() {
            return toJS(this.config.permanent);
        },
        has(d) {
            return this.markers.has(this.getKey(d));
        },
        any() {
            return this.markers.size !== 0;
        },
        getPayload(d) {
            return this.markers.get(this.getKey(d));
        },
        set: action("setFilter", function(d, payLoad = true) {
            if (Array.isArray(d)) return d.forEach(this.set.bind(this));
            const key = this.getKey(d);
            this.config.markers = mapToObj(this.markers.set(key, payLoad));
        }),
        delete: action("deleteFilter", function(d) {
            if (Array.isArray(d)) return d.forEach(this.delete.bind(this))
            const key = this.getKey(d);
            const success = this.markers.delete(key)
            this.config.markers = mapToObj(this.markers);
            return success;
        }),
        clear: action("clearFilter", function(d) {
            this.config.markers = {};
        }),
        toggle(d) {
            const key = this.getKey(d);
            const del = this.delete(key);
            if (!del) this.set(key);
            return !del;
        },
        getKey(d) {
            return isString(d) ? d : d[Symbol.for('key')];
        },
        includes(d, dim, property = dim) {           
            const dotted = dim + "." + property;
            return this.dimensions[dim] && this.dimensions[dim][dotted] && this.dimensions[dim][dotted].includes(d[property]);
        },
        get joinClause() {
            const join = {};
            const props = Object.keys(this.permanent);
            //restrictive join for permanent filter
            props.forEach(p => {
                if (this.parent.noFrameSpace.includes(p)) {
                    const filter = this.permanent[p];
                    
                    const joinid = "$" + p + "_";

                    join[joinid] = {
                        key: p,
                        where: filter
                    }
                }
            })

            return join;
        },
        get whereClause() {
            let filter = {};

            // dimension filters
            const dimFilters = [];

            this.parent.space.forEach(dim => {
                if (this.dimensions[dim]) {
                    dimFilters.push(this.dimensions[dim]);
                }
            })

            // specific marker filters
            const markerFilters = [];
            for (let [key, payload] of this.markers) {
                const markerSpace = Object.keys(key);
                if (arrayEquals(markerSpace, this.parent.noFrameSpace)) {
                    markerFilters.push(key);
                }
            }

            // combine dimension and marker filters
            if (markerFilters.length > 0) {
                filter["$or"] = markerFilters;
                if (dimFilters.length > 0) {
                    //filter["$or"].push({ "$and": dimFilters });
                    filter = Object.assign(filter, deepmerge.all(dimFilters));
                }
            } else {
                if (dimFilters.length > 0) {
                    // clean implicit $and
                    //filter = { "$and": [deepmerge.all(dimFilters)] };
                    filter = deepmerge.all(dimFilters);
                }
            }

            //add where for permanent filter join
            const joinKeys = Object.keys(this.joinClause);
            joinKeys.forEach(key => {
                filter[this.joinClause[key].key] = key;
            });

            return filter;
        },
    }
};