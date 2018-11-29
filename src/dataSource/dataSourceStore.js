import { baseDataSource } from './baseDataSource'
import { createStore } from '../genericStore'
import { defaultDecorator, mergeResults } from '../utils'
import { extendObservable } from 'mobx';

export const dataSourceStore = createStore(baseDataSource);

dataSourceStore.createAndAddType = function(type, readerObject) {
    this.addType(type, defaultDecorator({
        base: baseDataSource,
        functions: {
            get reader() {
                // copy reader object (using original will only allow one datasource of this type)
                const reader = Object.assign({}, readerObject);
                reader.init({
                    path: this.path,
                    assetsPath: this.config.assetsPath
                })
                return reader;
            }
        }
    }));
}

extendObservable(dataSourceStore, { get tags() {
    const S_DSNAME = Symbol.for("dataSourceName");
    
    return Promise.all([...this.named.values()].map(ds => ds.getTags().then(
        tags => tags.map(tag => { tag[S_DSNAME] = this.getId(ds); return tag; } ))))
        .then(results => mergeResults(results, ["tag"]));
}});
