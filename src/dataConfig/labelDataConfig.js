import { dataConfig } from './dataConfig';
import { compose, renameProperty } from '../utils';
import { observable, trace, toJS } from 'mobx';
import { fromPromise } from 'mobx-utils';
import { localeStore } from '../locale/localeStore';

export function labelDataConfig(cfg, parent) {
    const dataPlain = dataConfig(cfg, parent);

    return compose(dataPlain, {
        get markerSources() {
            const sources = new Set();
            for (const enc of this.parent.marker.encoding.values()) {
                sources.add(enc.data.source);
            }
            return [...sources];    
        },
        get promise() {
            const entityDims = this.space.filter(dim => this.source.isEntityConcept(dim));
            return fromPromise(Promise.all(this.markerSources.map(s => s.conceptsPromise)).then(() => {
                const entities = entityDims.map(dim => ({ 
                    source: this.source,
                    key: dim 
                }));

                this.markerSources.map(s => {
                    s.availability.data.map(({key, value}) => {
                        if (key.length == 1 && entityDims.includes(key[0]) && s.isEntityConcept(value)) {
                                entities.push({ source:s, key: value, domain: key[0] })
                        }
                    });
                });

                const langId = localeStore.get("locale").id;
                const labelPromises = entities.map(({ source, key, domain }) =>
                    source.query({
                        select: {
                            key: [key],
                            value: [this.concept]
                        },
                        from: "entities",
                        where: this.parent.marker.data.filter.permanent[key] || {},
                        language: langId
                    }).then(data => ({
                        dim: key,
                        data,
                        domain
                    }))
                );
                return fromPromise(Promise.all(labelPromises));
            }))
        },
        get lookups() {
            const concept = this.concept;
            const lookups = new Map();
            this.response.forEach(response => {
                const { dim, data } = response;
                const lookup = new Map();
                lookups.set(dim, lookup);
                data.forEach(row => {
                    lookup.set(row[dim], row[concept]);
                })
            });
            return lookups;
        },
        get responseMap() {
            //trace();
            return this.lookups;
        },
        addLabels(markers, encName) {
            // reduce lookups
            const space = toJS(this.space);
            const lookups = this.lookups;
            markers.forEach((marker, key) => {
                const label = {};
                space.forEach(dim => {
                    if (lookups.has(dim))
                        label[dim] = lookups.get(dim).get(marker[dim]);
                    else
                        label[dim] = marker[dim];
                });
                marker[encName] = label;
            });
        }
    })
}