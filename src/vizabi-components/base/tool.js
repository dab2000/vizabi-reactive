import * as utils from "base/utils";
//import Model from "base/model";
import Component from "base/component";
import EventSource, { DefaultEvent } from "base/events";
//import DimensionManager from "base/dimensionmanager";
//import DataManager from "base/datamanager";
import { UI } from "model/ui";
import { observable, reaction } from "mobx";
import { FULFILLED } from "mobx-utils";
import { vizabi } from '../../vizabi';

const class_loading_first = "vzb-loading-first";
const class_loading_data = "vzb-loading-data";
const class_placeholder = "vzb-placeholder";
const class_buttons_off = "vzb-buttonlist-off";

const templates = {};

//tool model is quite simple and doesn't need to be registered
// // const ToolModel = ({//Model.extend({
// //   /**
// //    * Initializes the tool model.
// //    * @param {Tool}   the tool this tool model belongs to
// //    * @param {Object} values The initial values of this model
// //    */
// //   init(tool, external_model) {
// //     this._id = utils.uniqueId("tm");
// //     this._type = "tool";
// //     this._component = tool;
// //     this.dimensionManager = DimensionManager(this);
// //     this.dataManager = DataManager(this);

// //     // defaults are defined on the Tool
// //     // this way, each tool can have it's own default model
// //     this.getClassDefaults = () => tool.default_model;

// //     // combine listeners from tool and external page to one object
// //     const listeners = utils.extend(tool.getToolListeners(), external_model.bind);
// //     delete external_model.bind; // bind shouldn't go to model tree

// //     this._super(tool.name, external_model, null, listeners);
// //   },

// //   /**
// //    * @return {object} Defaults of tool model and children
// //    * Tool defaults overwrite other models' default
// //    */
// //   getDefaults() {
// //     return utils.deepExtend({}, this.getSubmodelDefaults(), this.getClassDefaults());
// //   },

// //   validate() {

// //     const max = 10;
// //     const c = 0;
// //     const _this = this;

// //     function validate_func(c) {
// //       // ToolModel uses validate function declared on Tool so each Tool can have its own validation.
// //       const model = JSON.stringify(_this.getPlainObject());
// //       _this._component.validate(_this);
// //       const model2 = JSON.stringify(_this.getPlainObject());

// //       if (c >= max) {
// //         utils.error("Max validation loop.");
// //       } else if (model !== model2) {
// //         validate_func(c++);
// //       }
// //     }

// //     validate_func(c);
// //   }

// // });


//tool
const Tool = Component.extend({
  /**
   * Initializes the tool
   * @param {Object} placeholder object
   * @param {Object} external_model External model such as state, data, etc
   */
  init(placeholder, external_model) {
    this._id = utils.uniqueId("t");

    this.template = this.getToolTemplate();

    // super also calls createModel
    this._super({
      placeholder,
      model: external_model
    });

    this.prerender();
    this.setCSSClasses();
    this.setResizeHandler();

    this.postrender();

    reaction(() => ({
      presentation: this.model.ui.presentation,
      size: this.model.ui._prev_size
    }),
      ({size}) => {
        this.trigger("resize", size)
      }, {name:"resize"});

    reaction(() => this.model.locale.get("locale").stringsPromise.state == FULFILLED,
      (translated) => {
        if (!translated) return;
        this.translateStrings();
        this.model.ui.setRTL(this.model.locale.get("locale").isRTL())
      });
  },

  createModel(external_model) {
    external_model      = external_model      || {}; //external model can be undefined
    external_model.bind = external_model.bind || {}; //bind functions can be undefined
    //this.model = new ToolModel(this, external_model);
    //this.model.setInterModelListeners();

    const viz = vizabi(external_model);
    this.model = viz.stores;
    this.model.ui = observable(UI(external_model.ui));
    this.model.ui.init();
    this.config = viz.config;
  },

  getConfig() {
    return this.config;
  },
  
  getStores() {
    return this.model;
  },

  getReadyPromise() {
    return Promise.all(
      //map data connected promises
      this.components.map(c => c.getReadyPromise())
    );
  },

  getTranslationFunction(wrap) {
    const locale = this.model.locale.get("locale");
    const t_func = locale ? locale.getTFunction() : s => s;
  
    return wrap ?
      this._translatedStringFunction(t_func) :
    t_func;
  },

  getToolTemplate() {
    return this.template ||
      '<div class="vzb-tool vzb-tool-' + this.name + '">' +
        '<div class="vzb-tool-stage">' +
          '<div class="vzb-tool-viz">' +
          "</div>" +
          '<div class="vzb-tool-time-speed-sliders">' +
            '<div class="vzb-tool-timeslider">' +
            "</div>" +
            '<div class="vzb-tool-stepped-speed-slider">' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="vzb-tool-sidebar">' +
          '<div class="vzb-tool-dialogs">' +
          "</div>" +
          '<div class="vzb-tool-buttonlist">' +
          "</div>" +
        "</div>" +
        '<div class="vzb-tool-datanotes vzb-hidden">' +
        "</div>" +
        '<div class="vzb-tool-treemenu vzb-hidden">' +
        "</div>" +
        '<div class="vzb-tool-datawarning vzb-hidden">' +
        "</div>" +
        '<div class="vzb-tool-labels vzb-hidden">' +
        "</div>" +
      "</div>";
  },

  getToolListeners() {
    const _this = this;
    return utils.extend(
      this.model_binds,
      {
        "readyOnce": () => this.setResizeHandler(),
        "change": function(evt, path) {
          if (_this._ready) {
            _this.model.validate();

            if (evt.source.persistent)
              _this.model.trigger(new DefaultEvent(evt.source, "persistentChange"));
          }
        },
        "hook_change": function() {
          if (!_this.model.state.time.splash) { // not block when it initial splash screen
            _this.beforeLoading();
          }
        },
        "resize:ui": function() {
          if (_this._ready) {
            _this.triggerResize();
          }
        },
        "translate:locale": function() {
          _this.translateStrings();
          _this.model.ui.setRTL(_this.model.locale.isRTL());
        },
        "load_error1": (evt, error) => {
          this.renderError(error);
        }
      });
  },

  setResizeHandler() {
    //only tools have layout (manage sizes)
    this.model.ui.setContainer(this.element);
  },

  /**
   * Returns width and height of the area excluding time slider and toolbar/sidebar
   */
  getVizWidthHeight() {
    let width = 0, height = 0;
    if (this.element) {
      width = d3.select(this.element).select(".vzb-tool-viz").node().clientWidth;
      height = d3.select(this.element).select(".vzb-tool-viz").node().clientHeight;
    } else {
      utils.warn("Tool getVizWidthHeight(): missing this.element");
    }

    return { width, height };
  },

  triggerResize: utils.throttle(function() {
    this.trigger("resize");
  }, 100),

  startLoading() {
    this._super();

  //   //this.loadingDone();
  //   // Promise.all([
  //   //   this.model.startPreload(),
  //   //   this.startPreload()
  //   // ])
  //   //   .then(this.afterPreload.bind(this))
  //   //   .then(this.loadSplashScreen.bind(this))
  //   //   .then(() => utils.delay(300))
  //   //   .then(this.model.startLoading.bind(this.model))
  //   //   .then(this.finishLoading.bind(this))
  //   //   .catch(error => {
  //   //     utils.error("error in tool promise chain");
  //   //     this.model.triggerLoadError(error);
  //   //   });

  },

  loadSplashScreen() {
    if (this.model.ui.splash) {
      //TODO: cleanup hardcoded splash screen
      this.model.state.time.splash = true;
      return this.model.startLoading({
        splashScreen: true
      });
    }
    return Promise.resolve();
  },

  finishLoading() {
    this.model.state.time.splash = false;
  },

  getPersistentModel() {
    //try to find functions in properties of model.
    function removeFunctions(model) {
      for (const childKey in model) {
        if (typeof model[childKey] === "function") {
          delete model[childKey];
          utils.warn("minModel validation. Function found in enumerable properties of " + childKey + ". This key is deleted from minModel");
        }
        else if (typeof model[childKey] === "object")
          removeFunctions(model[childKey]);
      }
    }

    const currentToolModel = this.model.getPlainObject(true); // true = get only persistent model values
    removeFunctions(currentToolModel);
    return currentToolModel;
  },

  getPersistentMinimalModel(diffModel) {
    const defaultModel = this.model.getDefaults();
    const currentPersistentModel = this.getPersistentModel();
    const redundantModel = utils.deepExtend(defaultModel, diffModel);
    return utils.diffObject(currentPersistentModel, redundantModel);
  },

  /**
   * Clears a tool
   */

  clear() {
    this.model.ui.clear();
    this.setModel = this.getModel = () => void 0;
    this._super();
  },


  /**
   * Sets model from external page
   * @param {Object} JSONModel new model in JSON format
   * @param {Boolean} overwrite overwrite everything instead of extending
   */
  setModel(newModelJSON, overwrite) {
    if (overwrite) {
      this.model.reset(newModelJSON);
    } else {
      this.model.set(newModelJSON);
    }
    this.setCSSClasses();
  },

  /**
   * get model
   * @return {Object} JSON object of model
   */
  getModel() {
    return this.model.getPlainObject() || {};
  },
  /**
   * Displays loading class
   */
  beforeLoading() {
    utils.addClass(this.placeholder, class_loading_data);
  },

  /* ==========================
   * Validation and query
   * ==========================
   */
  /**
   * Validating the tool model
   * @param model the current tool model to be validated
   */
  validate(model) {
    model = this.model || model;

    if (!model || !model.state) return utils.warn("tool validation aborted: model.state looks wrong: " + model);
  },

  setCSSClasses() {
    //add placeholder class
    utils.addClass(this.placeholder, class_placeholder);
    //add-remove buttonlist class
    if (!this.model.ui || !this.model.ui.config.buttons || !this.model.ui.config.buttons.length) {
      utils.addClass(this.element, class_buttons_off);
    } else {
      utils.removeClass(this.element, class_buttons_off);
    }
  }

});

export default Tool;
