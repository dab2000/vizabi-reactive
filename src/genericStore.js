import { observable, action, toJS, isObservableObject } from 'mobx'
import { isString } from './utils'
import { resolveRef } from './vizabi';

export const createStore = function(baseType, extendedTypes = {}) {
    return observable({
        modelTypes: {
            base: baseType,
            all: {
                baseType,
                ...extendedTypes
            }
        },
        named: new Map(),
        anonymous: [],
        get: function(id) {
            return this.named.get(id);
        },
        addType: function(modelType, modelConstructor) {
            if (this.modelTypes[modelType])
                console.warn("Adding model type " + modelType + " failed. Type already exists", this);
            this.modelTypes.all[modelType] = modelConstructor;
        },
        getAll: function() {
            return [...this.named.values(), ...this.anonymous];
        },
        has: function(id) {
            return this.named.has(id);
        },
        create: function(config) {
            //if (isObservableObject(config)) config = toJS(config);
            let modelType = this.modelTypes.all[config.modelType] || this.modelTypes.base;
            let model = observable(modelType(config), modelType.decorate || null, { name: config.modelType || 'base' });
            if (model.setUpReactions) model.setUpReactions();
            return model;
        },
        set: action('store set', function(config, id) {
            let model = this.create(config);
            id ? this.named.set(id, model) : this.anonymous.push(model);
            return model;
        }),
        setMany: function(configs) {
            const models = {};
            for (let id in configs) {
                models[id] = this.set(configs[id], id);
            }
            return models;
        },
        /**
         * Definition is either the (1) model config object or (2) string id of the model  
         * Case 1: creates and returns anonymous model
         * Case 2: tries to fetch model from named models
         * @param {string/object} def 
         * @returns {model} Returns the model that was fetched or created
         */
        getByDefinition(def) {
            if (isString(def.ref))
                return resolveRef(def);
            if (!isString(def) && def !== null) {
                return this.set(def);
            } else if (this.has(def)) {
                return this.get(def);
            }
            console.warn("Store: cannot find model with id: " + def, { store: this });
            return null;
        },
        /**
         * 
         * @param {*} defs Object of model definitions
         * @returns {Map} Map with models according to definitions
         */
        getByDefinitions(defs) {
            const map = new Map();
            Object.keys(defs).forEach(prop => {
                map.set(prop, this.getByDefinition(defs[prop]))
            })
            return map;
        },

        getId(model) {
            return [...this.named.entries()].find(m => m[1] === model)[0];
        }

    });
}