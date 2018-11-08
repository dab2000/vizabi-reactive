import * as utils from "base/utils";
import Dialog from "components/dialogs/_dialog";

import show from "./show";
import select from "./select";
import singlehandleslider from "components/brushslider/singlehandleslider/singlehandleslider";
import indicatorpicker from "components/indicatorpicker/indicatorpicker";
import { reaction } from "mobx";

/*!
 * VIZABI FIND CONTROL
 * Reusable find dialog
 */

const Find = Dialog.extend("find", {

  init(config, parent) {
    this.name = "find";
    const _this = this;

    this.components = [{
      component: show,
      placeholder: ".vzb-dialog-panel-show",
      model: [config.modelConfig.frame, config.modelConfig.marker, config.modelConfig.marker + ".encoding:label", "locale"]
    }, {
      component: select,
      placeholder: ".vzb-dialog-panel-select",
      model: [config.modelConfig.frame, config.modelConfig.marker, config.modelConfig.marker + ".encoding:label", "locale"]
    }, {
      component: singlehandleslider,
      placeholder: ".vzb-dialog-bubbleopacity",
      model: ["ui.config", "locale"],
      arg: "opacitySelectDim"
    }];

    this.enableSelectShowSwitch = ((config.ui.dialogs.dialog || {}).find || {}).enableSelectShowSwitch || false;
    this.panelMode = ((config.ui.dialogs.dialog || {}).find || {}).panelMode || "select";
    this.enablePicker = ((config.ui.dialogs.dialog || {}).find || {}).enablePicker;
    if (this.enablePicker) {
      this.components.push({
        component: indicatorpicker,
        placeholder: ".vzb-find-filter-selector",
        model: [config.modelConfig.frame, config.modelConfig.marker, "locale"]
      });
    }

    // this.model_binds = {
    //   "change:ui.dialogs.dialog.find.enableSelectShowSwitch": function(evt) {
    //     if (!_this._readyOnce) return;
    //     _this.enableSelectShowSwitch = ((config.ui.dialogs.dialog || {}).find || {}).enableSelectShowSwitch || false;
    //     _this.element.select(".vzb-dialog-title-switch .vzb-switch-slider").classed("vzb-hidden", !_this.enableSelectShowSwitch);
    //     _this.element.select(".vzb-dialog-title-switch").style("pointer-events", _this.enableSelectShowSwitch ? "auto" : "none");
    //   },
    //   "translate:locale": function() {
    //     if (!_this._readyOnce) return;
    //     _this.input_search.attr("placeholder", _this.translator("placeholder/search") + "...");
    //   }
    // };

    this._super(config, parent);

    reaction(() => this.ui.dialogs.dialog.find.enableSelectShowSwitch, () => {
      if (!_this._readyOnce) return;
      _this.enableSelectShowSwitch = ((config.ui.dialogs.dialog || {}).find || {}).enableSelectShowSwitch || false;
      _this.element.select(".vzb-dialog-title-switch .vzb-switch-slider").classed("vzb-hidden", !_this.enableSelectShowSwitch);
      _this.element.select(".vzb-dialog-title-switch").style("pointer-events", _this.enableSelectShowSwitch ? "auto" : "none");
    });
  },

  /**
   * Grab the list div
   */
  readyOnce() {
    this._super();

    this.panelComps = { select: this.findChildByName("select"), show: this.findChildByName("show") };

    this.titleSwitch = this.element.select(".vzb-dialog-title-switch input");
    this.input_search = this.element.select(".vzb-find-search");
    this.panelsEl = this.contentEl.selectAll(".vzb-dialog-content");

    this.element.select(".vzb-dialog-title-switch .vzb-switch-slider").classed("vzb-hidden", !this.enableSelectShowSwitch);
    this.element.select(".vzb-dialog-title-switch").style("pointer-events", this.enableSelectShowSwitch ? "auto" : "none");    
    this.element.select(".vzb-find-filter-selector").classed("vzb-hidden", !this.enablePicker);
    this.element.select(".vzb-dialog-title").classed("vzb-title-two-rows", this.enablePicker);

    const _this = this;

    this.titleSwitch.on("change", () => {
      _this.panelMode = _this.titleSwitch.property("checked") ? "show" : "select";
      _this.panelsEl.classed("vzb-active", false);
      _this.contentEl.select(".vzb-dialog-panel-" + _this.panelMode).classed("vzb-active", true);
      _this.panelComps[_this.panelMode].showHideSearch();
      _this._buttonAdjust();
      _this.panelComps[_this.panelMode].showHideButtons();
    });
    this.titleSwitch.property("checked", this.panelMode !== "select");
    this.titleSwitch.dispatch("change");

    this.input_search.on("keyup", () => {
      const event = d3.event;
      if (event.keyCode == 13 && _this.input_search.node().value == "select all") {
        _this.input_search.node().value = "";
        //clear highlight so it doesn't get in the way when selecting an entity
        if (!utils.isTouchDevice()) _this.model.marker.clearHighlighted();
        _this.model.marker.selectAll();
        utils.defer(() => _this.panelComps[_this.panelMode].showHideSearch());
      }
    });

    this.input_search.on("input", () => {
      _this.panelComps[_this.panelMode].showHideSearch();
    });

    d3.select(this.input_search.node().parentNode)
      .on("reset", () => {
        utils.defer(() => _this.panelComps[_this.panelMode].showHideSearch());
      })
      .on("submit", () => {
        d3.event.preventDefault();
        return false;
      });


    const closeButton = this.buttonsEl.select(".vzb-dialog-button[data-click='closeDialog']");
    closeButton.on("click.panel", () => _this.panelComps[_this.panelMode].closeClick());

    this.translator = this.model.locale.getTFunction();
    this.input_search.attr("placeholder", this.translator("placeholder/search") + "...");

    //make sure it refreshes when all is reloaded
    this.root.on("ready", () => {
      _this.ready();
    });

  },

  getPanelMode() {
    return this.panelMode;
  },

  _buttonAdjust() {
    this.buttonsEl.selectAll(".vzb-dialog-buttons > :not([data-dialogtype])").classed("vzb-hidden", true);
    this.buttonsEl.selectAll(`[data-panel=${this.panelMode}]`).classed("vzb-hidden", false);
  },

  open() {
    const _this = this;
    this._super();

    this.input_search.node().value = "";
    this.panelComps[this.panelMode].showHideSearch();
    
    this.panelComps[this.panelMode].open();
  },

  transitionEnd(event) {
    this._super(event);

    if (!utils.isTouchDevice()) this.input_search.node().focus();
  },

});

export default Find;
