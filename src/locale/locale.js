import { applyDefaults } from "../utils";
import { action, when } from "mobx";
import * as utils from "../vizabiUtils";
import { fromPromise } from "mobx-utils";
import { dataSourceStore } from "../dataSource/dataSourceStore"; 
//import DataConnected from "models/dataconnected";

// this and many other locale information should at some point be stored in an external file with locale information (rtl, date formats etc)
const rtlLocales = ["ar", "ar-SA", "he", "he-IL"];

const defaultConfig = {
  id: "en",
  filePath: "assets/translation/"
}

//const LocaleModel = DataConnected.extend({
export function locale(config = {}, parent) {

  applyDefaults(config, defaultConfig);

  return {
    config,
    parent,

  /**
   * Default values for this model
   */
  getClassDefaults() {
    const defaults = {
      id: "en",
      filePath: "assets/translation/"
    };
    return utils.deepExtend(this._super(), defaults);
  },

  dataConnectedChildren: ["id"],
  strings: {},

  get id() {
    return this.config.id;
  },

  setId: action('set id', function(id) {
    this.config.id = id;
  }),

  get stringsPromise() {
    return fromPromise(
      this.strings[this.id] ? Promise.resolve() :
        // load UI strings only if we don't have them already
        new Promise((resolve, reject) => {
          utils.d3json(this.config.filePath + this.id + ".json", (error, strings) => {
            if (error) return reject(error);
            this._handleNewStrings(strings);
            resolve();
          });
        })
    )
  },

  get localePromise() {
    return fromPromise(Promise.all([this.stringsPromise,
      ...dataSourceStore.getAll().map(ds => ds.conceptPromise)]));
  },

  setUpReactions() {
    this.stringsPromise;
  },
  
  // /**
  //  * Initializes the locale model.
  //  * @param {Object} values The initial values of this model
  //  * @param parent A reference to the parent model
  //  * @param {Object} bind Initial events to bind
  //  */
  // init(name, values, parent, bind) {
  //   this._type = "locale";

  //   //same constructor, with same arguments
  //   //this._super(name, values, parent, bind);
  // },

  // _isLoading() {
  //   return (!this._loadedOnce || this._loadCall);
  // },

  // preloadData() {
  //   return this.loadData();
  // },

  // loadData(opts) {
  //   this.setReady(false);
  //   this._loadCall = true;

  //   // load new concept properties for each data source.
  //   // this should be done with listeners, but the load promise can't be returned
  //   // through the listeners

  //   const promises = [];

  //   if (opts && opts.dataConnectedChange) {
  //     utils.forEach(this._root._data, mdl => {
  //       if (mdl._type === "data") promises.push(mdl.loadConceptProps());
  //     });
  //   }

  //   // load UI strings only if we don't have them already
  //   if (!this.strings[this.id]) {
  //     promises.push(new Promise((resolve, reject) => {
  //       utils.d3json(this.filePath + this.id + ".json", (error, strings) => {
  //         if (error) return reject(error);
  //         this._handleNewStrings(strings);
  //         resolve();
  //       });
  //     }));
  //   }

  //   return Promise.all(promises)
  //     .then(() => this.trigger("translate"))
  //     .catch(error => this.handleLoadError(error));
  // },

  _handleNewStrings(receivedStrings) {
    this.strings[this.id] = this.strings[this.id]
      ? utils.extend(this.strings[this.id], receivedStrings)
      : receivedStrings;
  },

  /**
   * Gets a certain UI string
   * @param {String} stringId string identifier
   * @returns {string} translated string
   */
  getUIString(stringId) {
    if (this.strings && this.strings[this.id] && (this.strings[this.id][stringId] || this.strings[this.id][stringId] === "")) {
      return this.strings[this.id][stringId];
    }
    if (!this.strings || !this.strings[this.id]) utils.warn("Strings are not loaded for the " + this.id + " locale. Check if translation JSON is valid");
    return stringId;
  },

  /**
   * Gets the translation function
   * @returns {Function} translation function
   */
  getTFunction() {
    return (stringId, payload = {}) => (
      Object.keys(payload).reduce((result, key) => {
        const regexp = new RegExp("{{" + key + "}}", "g");
        return result.replace(regexp, payload[key]);
      },
      this.getUIString(stringId)
      )
    );
  },

  isRTL() {
    return (rtlLocales.indexOf(this.id) !== -1);
  },

  get dataPromise() {
    return this.stringsPromise;
  }

}};
