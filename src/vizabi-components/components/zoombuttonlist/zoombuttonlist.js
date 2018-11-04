import * as utils from "base/utils";
import Component from "base/component";
import * as iconset from "base/iconset";

/*!
 * VIZABI OPTIONSBUTTONLIST
 * Reusable optionsbuttonlist component
 */

//default existing buttons
const class_active = "vzb-active";
// var class_active_locked = "vzb-active-locked";
// var class_expand_dialog = "vzb-dialog-side";
// var class_hide_btn = "vzb-dialog-side-btn";
// var class_unavailable = "vzb-unavailable";
// var class_vzb_fullscreen = "vzb-force-fullscreen";
// var class_container_fullscreen = "vzb-container-fullscreen";

const ZoomButtonList = Component.extend({

  /**
   * Initializes the buttonlist
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, context) {

    //set properties
    const _this = this;
    this.name = "gapminder-zoombuttonlist";

    this.model_expects = [{
      name: "marker",
      type: "model"
    }, {
      name: "ui",
      type: "ui"
    }, {
      name: "locale",
      type: "locale"
    }];

    this._available_buttons = {
      "arrow": {
        title: "buttons/cursorarrow",
        icon: "cursorArrow",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "ui.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "plus": {
        title: "buttons/cursorplus",
        icon: "cursorPlus",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "ui.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "minus": {
        title: "buttons/cursorminus",
        icon: "cursorMinus",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "ui.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "hand": {
        title: "buttons/cursorhand",
        icon: "cursorHand",
        func: this.toggleCursorMode.bind(this),
        required: true,
        statebind: "ui.cursorMode",
        statebindfunc: this.setCursorMode.bind(this)
      },
      "hundredpercent": {
        title: "buttons/hundredpercent",
        icon: "hundredPercent",
        func: this.toggleHundredPercent.bind(this),
        required: true
        // ,
        // statebind: "ui.chart.trails",
        // statebindfunc: this.setBubbleTrails.bind(this)
      }
    };

    this.model_binds = {};

    Object.keys(this._available_buttons).forEach(buttonId => {
      const button = _this._available_buttons[buttonId];
      if (button && button.statebind) {
        _this.model_binds["change:" + button.statebind] = function(evt) {
          button.statebindfunc(buttonId, evt.source.value);
        };
      }
    });

    this._super(config, context);

  },

  readyOnce() {
    const _this = this;

    this.element = d3.select(this.placeholder);
    this.element.selectAll("div").remove();

    this._addButtons(Object.keys(this._available_buttons), []);
    this.setCursorMode("arrow");

  },

  /*
   * adds buttons configuration to the components and template_data
   * @param {Array} button_list list of buttons to be added
   */
  _addButtons(button_list, button_expand) {
    const _this = this;
    this._components_config = [];
    const details_btns = [];
    if (!button_list.length) return;
    //add a component for each button
    for (let i = 0; i < button_list.length; i++) {

      const btn = button_list[i];
      const btn_config = this._available_buttons[btn];

      //add template data
      const d = (btn_config) ? btn : "_default";
      const details_btn = utils.clone(this._available_buttons[d]);

      details_btn.id = btn;
      details_btn.icon = iconset[details_btn.icon];
      details_btns.push(details_btn);
    }

    const t = this.getTranslationFunction(true);

    this.element.selectAll("button").data(details_btns)
      .enter().append("button")
      .attr("class", d => {
        let cls = "vzb-buttonlist-btn";
        if (button_expand.length > 0) {
          if (button_expand.indexOf(d.id) > -1) {
            cls += " vzb-dialog-side-btn";
          }
        }

        return cls;
      })
      .attr("data-btn", d => d.id)
      .html(btn => "<span class='vzb-buttonlist-btn-icon fa'>" +
          btn.icon + "</span><span class='vzb-buttonlist-btn-title'>" +
          t(btn.title) + "</span>");

    const buttons = this.element.selectAll(".vzb-buttonlist-btn");

    //clicking the button
    buttons.on("click", function() {

      d3.event.preventDefault();
      d3.event.stopPropagation();

      const id = d3.select(this).attr("data-btn");
      _this.proceedClick(id);
    });

  },

  proceedClick(id) {
    const _this = this;
    const btn = _this.element.selectAll(".vzb-buttonlist-btn[data-btn='" + id + "']");
    const classes = btn.attr("class");
    const btn_config = _this._available_buttons[id];

    if (btn_config && btn_config.func) {
      btn_config.func(id);
    } else {
      const btn_active = classes.indexOf(class_active) === -1;

      btn.classed(class_active, btn_active);
      const evt = {};
      evt["id"] = id;
      evt["active"] = btn_active;
      _this.trigger("click", evt);
    }
  },

  setButtonActive(id, boolActive) {
    const btn = this.element.selectAll(".vzb-buttonlist-btn[data-btn='" + id + "']");

    btn.classed(class_active, boolActive);
  },

  toggleCursorMode(id) {
    const value = id;
    this.model.ui.set("cursorMode", value, false, false);
  },

  setCursorMode(id) {
    const value = this.model.ui.cursorMode ? this.model.ui.cursorMode : "arrow";
    this.element.selectAll(".vzb-buttonlist-btn")
      .classed(class_active, d => d.id == value);
  },

  toggleHundredPercent(id) {
    this.root.trigger("resetZoom");
  }

});

export default ZoomButtonList;
