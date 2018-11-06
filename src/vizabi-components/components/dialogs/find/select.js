import * as utils from "base/utils";
import Component from "base/component";
import { reaction } from "mobx";

/*!
 * VIZABI SHOW PANEL CONTROL
 * Reusable show panel dialog
 */

const Select = Component.extend({

  init(config, parent) {
    this.name = "select";
    const _this = this;

    this.template = this.template || require("raw-loader!./select.html");

    this.model_expects = this.model_expects ||
    [{
      name: "time",
      type: "time"
    }, {
      name: "marker",
      type: "marker"
    }, {
      name: "label",
      type: "label"
    }, {
      name: "locale",
      type: "locale"
    }];

/*
    this.model_binds = {
      "change:marker.select": function(evt) {
        _this.items.order();
        _this.selectDataPoints();
        _this.showHideButtons();
      },
      "change:time.playing": function(evt) {
        if (!_this.model.time.playing) {
          _this.time = _this.model.time.value;

          _this.model.marker.getFrame(_this.time, (values, time) => {
            if (!values || (_this.time - time)) return;
            _this.redrawDataPoints(values);
          });
        }
      },
      "change:time.value": function(evt) {
        // hide changes if the dialog is not visible
        if (!_this.placeholderEl.classed("vzb-active") && !_this.placeholderEl.classed("vzb-sidebar")) return;

        _this.time = _this.model.time.value;

        _this.model.marker.getFrame(_this.time, values => {
          if (!values) return;
          _this.redrawDataPoints(values);
        });
      }
    }
    */

    this._super(config, parent);

    reaction(() => this.model.marker.encoding.get("selected").data.filter.markers.size,
      () => {
        this.items.order();
        this.selectDataPoints();
        this.showHideButtons();
      });

    reaction(() => this.model.time.value,
      time => {
        if (!this._readyOnce) return;
        // hide changes if the dialog is not visible
        if (!this.parent.placeholderEl.classed("vzb-active") && !this.parent.placeholderEl.classed("vzb-sidebar")) return;

        this.time = time;

        this.model.time.getFrame(time, values => {
          if (!values) return;
          this.redrawDataPoints(values);
        });

      });
  },

  /**
   * Grab the list div
   */
  readyOnce() {
    this.parentElement = this.parent.element;
    this.contentEl = this.element = d3.select(this.element.parentNode);

    this.list = this.element.select(".vzb-select-list");
    this.input_search = this.parentElement.select(".vzb-find-search");
    this.deselect_all = this.parentElement.select(".vzb-select-deselect");
    this.opacity_nonselected = this.parentElement.select(".vzb-dialog-bubbleopacity");

    const _this = this;

    this.deselect_all.on("click", () => {
      _this.deselectMarkers();
    });
  

  },

  /**
   * Build the list everytime it updates
   */
  //TODO: split update in render and update methods
  ready() {
    this._super();

    this.translator = this.model.locale.getTFunction();

    const _this = this;

    this.KEYS = this.model.marker.data.noFrameSpace;
    this.importantHooks = _this.model.marker.important;

    this.time = this.model.time.value;
    this.model.time.getFrame(this.time, values => {
      if (!values) return;

      const data = [..._this.model.marker.markerKeys].map(key => {
        const labelObj = values.get(key).label;
        const d = {};
        d[Symbol.for("key")] = key;
        d.brokenData = false;
        d.name = labelObj ? this.KEYS.map(key => labelObj[key]).join(",") : key;//_this.model.marker.getCompoundLabelText(d, values);
        return d;
      });

      //sort data alphabetically
      data.sort((a, b) => (a.name < b.name) ? -1 : 1);

      _this.list.html("");

      _this.items = _this.list.selectAll(".vzb-select-item")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "vzb-select-item vzb-dialog-checkbox");

      _this.items.append("input")
        .attr("type", "checkbox")
        .attr("class", "vzb-select-item")
        .attr("id", (d, i) => "-select-" + i + "-" + _this._id)
        .on("change", d => {
          //clear highlight so it doesn't get in the way when selecting an entity
          if (!utils.isTouchDevice()) _this.model.marker.encoding.get("highlighted").data.filter.clear();
          _this.model.marker.encoding.get("selected").data.filter.toggle(d);
          //return to highlighted state
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.marker.encoding.get("highlighted").data.filter.set(d);
        });

      _this.items.append("label")
        .attr("for", (d, i) => "-select-" + i + "-" + _this._id)
        .text(d => d.name)
        .attr("title", function(d) {
          return this.offsetWidth < this.scrollWidth ? d.name : null;
        })
        .on("mouseover", d => {
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.marker.encoding.get("highlighted").data.filter.set(d);
        })
        .on("mouseout", d => {
          if (!utils.isTouchDevice()) _this.model.marker.encoding.get("highlighted").data.filter.clear();
        });
      utils.preventAncestorScrolling(_this.element.select(".vzb-dialog-scrollable"));

      _this.redrawDataPoints(values);
      _this.selectDataPoints();
      _this.showHideSearch();
      _this.showHideButtons();

    });
  },

  redrawDataPoints(values) {
    const _this = this;
    const KEYS = this.KEYS;

    _this.items
      .each(function(d) {
        const view = d3.select(this).select("label");
        d.brokenData = false;

        utils.forEach(_this.importantHooks, name => {
          if (_this.model.marker.encoding.get(name).data.conceptProps.use == "constant") return;
          const value = (values.get(d[Symbol.for("key")]) || {})[name];
          if (!value && value !== 0) {
            d.brokenData = true;
            return false;
          }
        });

        const nameIfEllipsis = this.offsetWidth < this.scrollWidth ? d.name : "";
        view
          .classed("vzb-select-item-brokendata", d.brokenData)
          .attr("title", nameIfEllipsis + (d.brokenData ? (nameIfEllipsis ? " | " : "") + _this.model.time.format.data(_this.time) + ": " + _this.translator("hints/nodata") : ""));
      });
  },

  selectDataPoints() {
    const _this = this;
    const selected = this.model.marker.encoding.get("selected");
    this.items.selectAll("input")
      .property("checked", function(d) {
        const isSelected = selected.data.filter.has(d);
        d3.select(this.parentNode).classed("vzb-checked", isSelected);
        return isSelected;
      });
    const lastCheckedNode = this.list.selectAll(".vzb-checked")
      .classed("vzb-separator", false)
      .lower()
      .nodes()[0];
    d3.select(lastCheckedNode).classed("vzb-separator", true);
    this.contentEl.node().scrollTop = 0;
  },

  showHideSearch() {
    if (!this._readyOnce || this.parent.getPanelMode() !== "select") return;

    let search = this.input_search.node().value || "";
    search = search.toLowerCase();

    this.list.selectAll(".vzb-select-item")
      .classed("vzb-hidden", d => {
        const lower = (d.name || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });
  },

  showHideButtons() {
    if (!this._readyOnce || this.parent.getPanelMode() !== "select") return;

    const someSelected = this.model.marker.encoding.get("selected").data.filter.any();
    this.deselect_all.classed("vzb-hidden", !someSelected);
    this.opacity_nonselected.classed("vzb-hidden", !someSelected);
    if (someSelected) {
      this.parent.findChildByName("singlehandleslider").trigger("resize");
    }
  },

  deselectMarkers() {
    this.model.marker.encoding.get("selected").data.filter.clear();
  },

  closeClick() {

  }


});

export default Select;
