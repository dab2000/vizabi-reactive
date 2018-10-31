import * as utils from "base/utils";
import Component from "base/component";

/*!
 * VIZABI SHOW PANEL CONTROL
 * Reusable show panel dialog
 */

const Select = Component.extend({

  init(config, parent) {
    this.name = "show";
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

    this._super(config, parent);
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

    const _this = this;

    //this.importantHooks = _this.model.marker.getImportantHooks();

    this.time = this.model.time.value;
    this.model.time.getFrame(this.time, values => {
      if (!values) return;

      const data = [..._this.model.marker.markerKeys].map(key => {
        const d = {};
        d.key = key;
        d.brokenData = false;
        d.name = key;//_this.model.marker.getCompoundLabelText(d, values);
        return d;
      });

      //sort data alphabetically
      data.sort((a, b) => (a.name < b.name) ? -1 : 1);

      _this.list.html("");

      _this.items = _this.list.selectAll(".vzb-find-item")
        .data(data)
        .enter()
        .append("div")
        .attr("class", "vzb-find-item vzb-dialog-checkbox");

      _this.items.append("input")
        .attr("type", "checkbox")
        .attr("class", "vzb-find-item")
        .attr("id", (d, i) => "-find-" + i + "-" + _this._id)
        .on("change", d => {
          //clear highlight so it doesn't get in the way when selecting an entity
          if (!utils.isTouchDevice()) _this.model.marker.clearHighlighted();
          _this.model.marker.selectMarker(d);
          //return to highlighted state
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.marker.highlightMarker(d);
        });

      _this.items.append("label")
        .attr("for", (d, i) => "-find-" + i + "-" + _this._id)
        .text(d => d.name)
        .attr("title", function(d) {
          return this.offsetWidth < this.scrollWidth ? d.name : null;
        })
        .on("mouseover", d => {
          if (!utils.isTouchDevice() && !d.brokenData) _this.model.marker.highlightMarker(d);
        })
        .on("mouseout", d => {
          if (!utils.isTouchDevice()) _this.model.marker.clearHighlighted();
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
          if (_this.model.marker[name].use == "constant") return;
          const hook = values[name];
          if (!hook) return;
          const value = hook[utils.getKey(d, KEYS)];
          if (!value && value !== 0) {
            d.brokenData = true;
            return false;
          }
        });

        const nameIfEllipsis = this.offsetWidth < this.scrollWidth ? d.name : "";
        view
          .classed("vzb-find-item-brokendata", d.brokenData)
          .attr("title", nameIfEllipsis + (d.brokenData ? (nameIfEllipsis ? " | " : "") + _this.model.time.formatDate(_this.time) + ": " + _this.translator("hints/nodata") : ""));
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

    this.list.selectAll(".vzb-find-item")
      .classed("vzb-hidden", d => {
        const lower = (d.name || "").toString().toLowerCase();
        return (lower.indexOf(search) === -1);
      });
  },

  showHideButtons() {
    if (!this._readyOnce || this.parent.getPanelMode() !== "select") return;

    const someSelected = !!this.model.marker.select.length;
    this.deselect_all.classed("vzb-hidden", !someSelected);
    this.opacity_nonselected.classed("vzb-hidden", !someSelected);
    if (someSelected) {
      this.findChildByName("singlehandleslider").trigger("resize");
    }
  },

  deselectMarkers() {
    this.model.marker.clearSelected();
  },

  closeClick() {

  }


});

export default Select;