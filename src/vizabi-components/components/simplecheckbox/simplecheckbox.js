import * as utils from "base/utils";
import Component from "base/component";
import { reaction } from "mobx";

export default Component.extend({

  init(config, context) {
    this.template =
      '<span class="vzb-sc-holder vzb-dialog-checkbox"><input type="checkbox"><label></label></span>';
    const _this = this;
    this.name = "gapminder-simplecheckbox";

    this.checkbox = config.checkbox;
    this.submodel = config.submodel;

    this.model_expects = [{
      name: "mdl"
      //TODO: learn how to expect model "axis" or "size" or "color"
    }, {
      name: "locale",
      type: "locale"
    }];


    this.model_binds = {
      "change:mdl": function(evt) {
        _this.updateView();
      },
      "translate:locale": function(evt) {
        _this.updateView();
      }
    };

    // const submodel = (this.submodel) ? this.submodel + ":" : "";
    // this.model_binds["change:mdl." + submodel + this.checkbox] = function() {
    //   _this.updateView();
    // };

    //contructor is the same as any component
    this._super(config, context);

    this.parentModel = (this.submodel) ? this.model.mdl[this.submodel] : this.model.mdl;
    this.setterName = "set" + utils.capitalize(this.checkbox);
    this.useSetter = this.parentModel && !!this.parentModel[this.setterName];

    reaction(() => this.parentModel && this.parentModel[this.checkbox], () => {
        this.updateView();
      })
  },

  ready() {
    this.updateView();
  },

  readyOnce() {
    const _this = this;
    this.element = d3.select(this.element);
    const id = "-check-" + _this._id;
    this.labelEl = this.element.select("label").attr("for", id);
    this.checkEl = this.element.select("input").attr("id", id)
      .on("change", function() {
        _this._setModel(d3.select(this).property("checked"));
      });
  },

  updateView() {
    this.translator = this.model.locale.getTFunction();
    const modelExists = this.parentModel && (this.parentModel[this.checkbox] || this.parentModel[this.checkbox] === false);
    this.labelEl.classed("vzb-hidden", !modelExists);
    if (modelExists) {
      this.labelEl.text(this.translator("check/" + this.checkbox));
      this.checkEl.property("checked", !!this.parentModel[this.checkbox]);
    }
  },

  _setModel(value) {
    if (this.useSetter) {
      this.parentModel[this.setterName](value);
    } else {
      this.parentModel[this.checkbox] = value;
    }
  }

});
