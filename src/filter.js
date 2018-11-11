import { action, isObservableArray, toJS } from 'mobx';
import { isString, mapToObj, applyDefaults, deepmerge } from './utils';
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
                cfg.map(m => [m, true]) :
                Object.entries(cfg);
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
        includes(d, dim, property) {           
            const _property = property ? property : dim;
            return ((this.normalizedDimFilter[dim] || {})[_property] || []).includes(d[_property]);
        },
        get normalizedDimFilter() {
            const normFilter = {};

            const dimFilters = new Map();

            this.parent.space.forEach(dim => {
                if (this.dimensions[dim]) {
                    dimFilters.set(dim ,this.dimensions[dim]);
                }            
            })

            dimFilters.forEach((dimFilter, dim) => {
                normFilter[dim] = {};
                const _simpleFilter = [];
                dimFilter.forEach(filter => {
                    if (!isString(filter)) {
                        normFilter[dim] = filter;
                    } else {
                        _simpleFilter.push(filter);
                    }
                });
                if (_simpleFilter.length) {
                    if (normFilter[dim][dim]) {
                        normFilter[dim][dim].push(..._simpleFilter);
                    } else {
                        normFilter[dim][dim] = _simpleFilter;
                    }
                }
            });

            return normFilter;
        },
        get joinClause() {
            const join = {};

            // dimension filters
            const dimFilters = new Map();
            const permanentFilters = new Map();
            this.parent.space.forEach(dim => {
                if (this.dimensions[dim]) {
                    dimFilters.set(dim ,this.dimensions[dim]);
                }
                if (this.permanent[dim]) {
                    permanentFilters.set(dim ,this.permanent[dim]);
                }

                if (dimFilters.has(dim) || permanentFilters.has(dim)) {
                    join["$" + dim] = {
                        key: dim,
                        where: { "$and": [] }
                    };
                }
            })

            dimFilters.forEach((dimFilter, dim) => {
                const _simpleFilter = [];
                dimFilter.forEach(filter => {
                    if (!isString(filter)) {
                        const _filter = {};
                        join["$" + dim].where["$and"].push({ "$or": [_filter] });
                        Object.keys(filter).forEach(key => {
                            _filter[key] = { "$in": filter[key] };
                        });
                    } else {
                        _simpleFilter.push(filter);
                    }
                });
                if (_simpleFilter.length) {
                    join["$" + dim].where["$and"].push({ [dim]: { "$in": _simpleFilter } });
                }
            });

            permanentFilters.forEach((filter, dim) => {
                join["$" + dim].where["$and"].push(filter);
            })

            return join;
        },

        get whereClause() {
            let filter = {};

            // dimension filters
            const dimFilters = [];

            Object.keys(this.joinClause).forEach(key => {
                dimFilters.push({ [key.slice(1)]: key });
            });

            // this.parent.space.forEach(dim => {
            //     if (this.dimensions[dim]) {
            //         dimFilters.push(this.dimensions[dim]);
            //     }
            // })

            // specific marker filters
            const markerFilters = [];
            for (let [key, payload] of this.markers) {
                const markerSpace = Object.keys(key);
                if (arrayEquals(markerSpace, this.parent.space)) {
                    markerFilters.push(key);
                }
            }

            // combine dimension and marker filters
            if (markerFilters.length > 0) {
                filter["$or"] = markerFilters;
                if (dimFilters.length > 0) {
                    filter["$or"].push({ "$and": dimFilters });
                }
            } else {
                if (dimFilters.length > 0) {
                    // clean implicit $and
                    filter = { "$and": [deepmerge.all(dimFilters)] };
                }
            }

            return filter;
        },
    }
};