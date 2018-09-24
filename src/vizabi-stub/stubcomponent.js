import { autorun, action, when, reaction, spy, observable } from 'mobx';
import EventSource from "./base/events";
import * as utils from "./base/utils";
import { FULFILLED } from 'mobx-utils';



const Component = EventSource.extend({
  init(placeholder, external_model) {
    this._id = utils.uniqueId("t");
    
    this._super();

    const template = this.getToolTemplate();
    this.placeholder = d3.select(placeholder).node();
    this.placeholder.innerHTML = template;
    this.element = this.placeholder.children[0];

    this.stores = external_model.stores;
    this.config = external_model.config;

    this.model = {
      marker: this.stores.tool.get(this.name).marker,
      ui: this.stores.tool.get(this.name).ui
    }

    this.model.ui.setContainer(this.placeholder);

    when(() => {
      return this.model.marker.dataPromise.state == FULFILLED
    },
      () => {
        this._readyOnce = true;
        this.readyOnce()
      }, {name:"readyOnce"} );
    reaction(() => this.model.marker.dataPromise.state == FULFILLED,
      (ready) => {
        (this._ready = ready) && this.ready();
      },{name:"ready"});
    reaction(() => ({
      width: window.appState.width,
      height: window.appState.height
    }), (size) => this.trigger("resize", size), {name:"resize"});

  },

  getToolTemplate() {
    return String.prototype.concat('<div class="vzb-tool vzb-tool-', this.name,'">',
      '<div class="vzb-tool-stage">', '<div class="vzb-tool-viz">',
      this.template, "</div>", "</div>", "</div>");
  },

  getActiveProfile(profiles, presentationProfileChanges) {
    // get layout values
    const layoutProfile = this.getLayoutProfile();
    const presentationMode = this.getPresentationMode();
    const activeProfile = utils.deepClone(profiles[layoutProfile]); // clone so it can be extended without changing the original profile

    // extend the profile with presentation mode values
    if (presentationMode && (presentationProfileChanges || {})[layoutProfile]) {
      utils.deepExtend(activeProfile, presentationProfileChanges[layoutProfile]);
    }

    return activeProfile;
  },

  getLayoutProfile() {
    // get profile from parent if layout is not available
    return this.model.ui ?
      this.model.ui.currentProfile() :
      this.parent.getLayoutProfile();
  },

  /**
   * Get if presentation mode is set of the current tool
   * @returns {Bool} presentation mode
   */
  getPresentationMode() {
    // get profile from parent if layout is not available
    return this.model.ui ?
      this.model.ui.getPresentationMode() :
      this.parent.getPresentationMode();
  },
});

export default Component;