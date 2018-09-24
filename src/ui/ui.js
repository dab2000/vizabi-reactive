import { applyDefaults } from "../utils";
import * as utils from "../vizabiUtils";
import { extendObservable } from "mobx";

//classes are vzb-portrait, vzb-landscape...
const class_prefix = "vzb-";
const class_presentation = "presentation";
const class_rtl = "rtl";
const class_portrait = "vzb-portrait";
const class_landscape = "vzb-landscape";

const defaultConfig = {
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 1,
  presentation: false,
  buttons: [],
  dialogs: {
    dialog: { find: { enableSelectShowSwitch: false } },
    popup: [],
    sidebar: [],
    moreoptions: []
  },
  splash: false
};

//const UI = Model.extend({
export function UI(config = {}, parent) {

  applyDefaults(config, defaultConfig);

  return {
    config,
    parent,

  screen_profiles: {
    small: {
      min_width: 0,
      min_height: 0
    },
    medium: {
      min_width: 600,
      min_height: 400
    },
    large: {
      min_width: 900,
      min_height: 520
    }
  },

  getClassDefaults() {
    const defaults = {
      presentation: false,
      buttons: [],
      dialogs: {
        dialog: { find: { enableSelectShowSwitch: false } },
        popup: [],
        sidebar: [],
        moreoptions: []
      },
      splash: false
    };
    return utils.deepExtend(this._super(), defaults);
  },


  /**
   * Initializes the layout manager
   */
  ////init(name, values, parent, bind) {
  init() {

    this._type = "ui";
    this._container = null;
    //dom element
    this._curr_profile = "small";
    this._prev_size = {};

    //resize when window resizes
    this.resizeHandler = this.resizeHandler.bind(this);
    window.addEventListener("resize", this.resizeHandler);
    ////bind["change:presentation"] = this.updatePresentation.bind(this);

    ////this._super(name, values, parent, bind);

    //TODO: remove later if IOS >10.3.2
    //https://openradar.appspot.com/31725316
    const detectIOS_10_3 = () => {
      const version = /(?:iPad|iPhone|iPod).+OS\s+(\d+)_(\d+)/.exec(navigator.userAgent);
      return version && +version[1] >= 10 && +version[2] > 2 && !window.MSStream;
    };
    if (detectIOS_10_3()) {
      this.setSize = utils.debounce(this.setSize, 500);
    }
  },

  resizeHandler(args = {}) {
    if (this._container) {
      this.setSize(args.force || false);
    }
  },

  /**
   * Calculates the size of the newly resized container
   */
  setSize(force) {
    const _this = this;
    const width = this._container.clientWidth;
    const height = this._container.clientHeight;

    /**
     * issue #1118
     * check if device is iPhone then add top margin for searchbar if it visible
     */
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent) // browser is safari
      && navigator.userAgent.match(/iPhone/i) // checking device
    ) {
      this._container.style.top =  0;
      if (this._container.clientWidth > this._container.clientHeight // landscape mode
        && this._container.clientWidth < 700) {  // small device
        const bodyHeight = this._container.clientHeight;
        const windowHeight = window.innerHeight;
        if (2 < (bodyHeight - windowHeight) && (bodyHeight - windowHeight) <= 45) { // check searchbar is visible
          this._container.style.top =  44 + "px";
          document.body.scrollTop = 44; // scrolling empty space
        }
      }
    }

    if (!force && this._prev_size && this._prev_size.width === width && this._prev_size.height === height
       || !width || !height) {
      return;
    }

    // choose profile depending on size
    utils.forEach(this.screen_profiles, (range, size) => {
      //remove class
      utils.removeClass(_this._container, class_prefix + size);
      //find best fit
      if (width >= range.min_width && height >= range.min_height) {
        _this._curr_profile = size;
      }
    });

    //update size class
    utils.addClass(this._container, class_prefix + this._curr_profile);

    //toggle, untoggle classes based on orientation
    utils.classed(this._container, class_portrait, width < height);
    utils.classed(this._container, class_landscape, !(width < height));

    //this._prev_size.width = width;
    //this._prev_size.height = height;
    this._prev_size = { width, height};
    //this.trigger("resize");
  },

  /**
   * Sets the container for this layout
   * @param container DOM element
   */
  setContainer(container) {
    if (!container.clientWidth || !container.clientHeight) utils.warn("Vizabi is being initialised with a container of incorrect width or height. While this may be handled without a crash, it's not considered a healthy behavior. You should call Vizabi(placeholder,...) function when placeholder is not display:none and has some >0 !=auto width and height");

    this._container = container;
    this.setSize();
    this.updatePresentation();
  },

  /**
   * Sets the presentation mode for this layout
   * @param {Bool} presentation mode on or off
   */
  updatePresentation() {
    utils.classed(this._container, class_prefix + class_presentation, this.presentation);
    //this.trigger("resize");
  },

  getPresentationMode() {
    return this.presentation;
  },

  setRTL(flag) {
    utils.classed(this._container, class_prefix + class_rtl, flag);
  },

  /**
   * Gets the current selected profile
   * @returns {String} name of current profile
   */
  currentProfile() {
    return this._curr_profile;
  },

  clear() {
    window.removeEventListener("resize", this.resizeHandler);
  }

}}
