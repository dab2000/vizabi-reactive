const {
  utils,
  Component,
  helpers: {
    "d3.axisWithLabelPicker": axisSmart,
    "d3.collisionResolver": collisionResolver 
  },
  iconset: {
    warn: iconWarn,
    question: iconQuestion
  }
} = Vizabi;
import { autorun, action, when, reaction, spy, observable, runInAction } from 'mobx';
import { FULFILLED } from "mobx-utils";


//
// LINE CHART COMPONENT
const LCComponent = Component.extend("linechart", {

  init(config, context) {
    const _this = this;
    this.name = "linechart";
    this.template = require("raw-loader!./template.html");

    //define expected models for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "marker",
      type: "marker"
    }, {
      name: "locale",
      type: "locale"
    }, {
      name: "ui",
      type: "ui"
    }];

/*
    this.model_binds = {
      "change:time.value": function() {
        if (!_this._readyOnce) return;
        _this.updateTime();
        _this.redrawDataPoints();          
      },
      "change:time.playing": function() {
        // hide tooltip on touch devices when playing
        if (_this.model.time.playing && utils.isTouchDevice() && !_this.tooltip.classed("vzb-hidden")) _this.tooltip.classed("vzb-hidden", true);
  
        if (!_this.model.ui.config.chart.hideXAxisValue && _this.model.time.playing && _this.time - _this.model.time.start === 0) {
          _this.xAxisEl.call(
            _this.xAxis
              .highlightTransDuration(0)
              .highlightValue(_this.time)
          );
        }
      },
      "change:time.start": function() {
        if (!_this._readyOnce || !_this.all_values || !_this.values) return;
        _this.updateIndicators();
        _this.updateShow();
        _this.zoomToMaxMin();
        _this.updateSize();
        _this.redrawDataPoints();
        _this.highlightLines();        
      },
      "change:time.end": function() {
        if (!_this._readyOnce || !_this.all_values || !_this.values) return;
        _this.updateIndicators();
        _this.updateShow();
        _this.zoomToMaxMin();
        _this.updateSize();
        _this.redrawDataPoints();
        _this.highlightLines();        
      },
      "change:marker": function(evt, path) {
        if (!_this._readyOnce) return;
        if (path.indexOf("domainMin") > -1 || path.indexOf("domainMax") > -1 ||
          path.indexOf("zoomedMin") > -1 || path.indexOf("zoomedMax") > -1) {
          if (!_this.yScale || !_this.xScale) return; //abort if building of the scale is in progress
          if (path.indexOf("axis_x") > -1) {
            const startOrigin = _this.model.time.formatDate(_this.model.marker.axis_x.getZoomedMin());
            const endOrigin = _this.model.time.formatDate(_this.model.marker.axis_x.getZoomedMax());
            _this.model.time.set({
              startOrigin: startOrigin,
              endOrigin: endOrigin
            });
            return;      
          }
          if (!_this.all_values || !_this.values) return;
          _this.updateIndicators();
          _this.updateShow();
          _this.zoomToMaxMin();
          _this.updateSize();
          _this.updateTime();
          _this.redrawDataPoints();
          _this.highlightLines();          
          return;
        }
        if (path.indexOf("scaleType") > -1) {
          if (!_this.all_values || !_this.values) return;
          _this.updateIndicators();
          _this.updateShow();
          _this.zoomToMaxMin();
          _this.updateSize();
          _this.redrawDataPoints();
          _this.highlightLines();          
        }
      },
      "change:marker.highlight": function() {
        if (!_this._readyOnce) return;
        _this.highlightLines();
      },
      "change:marker.select": function() {
        if (!_this._readyOnce) return;
        _this.updateDoubtOpacity();
        _this.highlightLines();
      },
      "change:marker.opacitySelectDim": function() {
        if (!_this._readyOnce) return;
        _this.highlightLines();
      },
      "change:marker.opacityRegular": function() {
        if (!_this._readyOnce) return;
        _this.highlightLines();
      },
      "change:marker.color": function() {
        if (!_this._ready) return;
        _this.getFrame(_this.model.time.value, (frame, time) => {
          if (!_this._frameIsValid(frame)) return utils.warn("change:marker.color: empty data received from marker.getFrame(). doing nothing");
          _this.values = frame;
          _this.updateColors();
        });
      }
    };*/

    this._super(config, context);
    
    reaction(() => this.model.marker.encoding.get("frame").value,
      (propValue) => {
        if (!_this._readyOnce) return;
        _this.updateTime();
        _this.redrawDataPoints();          
      });
  
    reaction(() => this.model.marker.encoding.get("frame").playing,
      (propValue) => {
        // hide tooltip on touch devices when playing
        if (propValue && utils.isTouchDevice() && !_this.tooltip.classed("vzb-hidden")) _this.tooltip.classed("vzb-hidden", true);
  
        if (!_this.model.ui.config.chart.hideXAxisValue && propValue && _this.time - _this.model.marker.encoding.get("frame").start === 0) {
          _this.xAxisEl.call(
            _this.xAxis
              .highlightTransDuration(0)
              .highlightValue(_this.time)
          );
        }
      });
  
    reaction(() => ({
      h: this.model.marker.encoding.get("highlighted").data.filter.any(),
      s: this.model.marker.encoding.get("selected").data.filter.any()
      }), (propValue) => {
      if (!_this._readyOnce) return;
      _this.highlightLines();
    });

    reaction(() => [this.model.ui.config.opacitySelectDim,
      this.model.ui.config.opacityRegular], () => {
      if (!_this._readyOnce) return;
      _this.highlightLines();
    });

    reaction(() => {
      const encY = this.model.marker.encoding.get("y");
      return [
        encY.scale.config.domain,
        encY.scale.type, 
        encY.scale.domainMin,
        encY.scale.domainMax,
        encY.scale.zoomedMin,
        encY.scale.zoomedMax
      ]
    }, () => {
      if (!this.isReady() || !this.all_values || !this.values) return;
      this.updateIndicators();
      this.updateShow();
      this.zoomToMaxMin();
      this.updateSize();
      this.updateTime();
      this.redrawDataPoints();
      this.highlightLines();          
    });

    reaction(() => this.model.marker.encoding.get("color").palette, palette => {
      if (!_this._readyOnce) return;
      this.updateColors();
    });

    reaction(() => this.model.marker.encoding.get("x").scale.config.domain, domain => {
      runInAction(() => {
        this.model.time.scale.config.domain = domain
      });
    });
    reaction(() => this.model.marker.encoding.get("frame").scale.config.domain, domain => {
      if (!this.isReady() || !this.all_values || !this.values) return;
      this.updateIndicators();
      this.updateShow();
      this.zoomToMaxMin();
      this.updateSize();
      this.redrawDataPoints();
      this.highlightLines();        
    });

    this.xScale = null;
    this.yScale = null;

    this.rangeXRatio = 1;
    this.rangeXShift = 0;

    this.rangeYRatio = 1;
    this.rangeYShift = 0;
    this.lineWidthScale = d3.scaleLinear().domain([0, 20]).range([7, 1]).clamp(true);
    this.xAxis = axisSmart("bottom");
    this.yAxis = axisSmart("left");

    this.COLOR_BLACKISH = "#333";
    this.COLOR_WHITEISH = "#fdfdfd";
    this.COLOR_WHITEISH_SHADE = "#555";

    this.isDataPreprocessed = false;
    this.timeUpdatedOnce = false;
    this.sizeUpdatedOnce = false;

    this.getNearestKey = utils.memoize(this.getNearestKey);
  },

  /*
   * domReady:
   * Executed after template is loaded
   * Ideally, it contains instantiations related to template
   */
  readyOnce() {
    const _this = this;

    this.element = d3.select(this.element);
    this.graph = this.element.select(".vzb-lc-graph");

    this.yAxisElContainer = this.graph.select(".vzb-lc-axis-y");
    this.yAxisEl = this.yAxisElContainer.select("g");

    this.xAxisElContainer = this.graph.select(".vzb-lc-axis-x");
    this.xAxisEl = this.xAxisElContainer.select("g");

    this.xTitleEl = this.graph.select(".vzb-lc-axis-x-title");
    this.yTitleEl = this.graph.select(".vzb-lc-axis-y-title");
    this.yInfoEl = this.graph.select(".vzb-lc-axis-y-info");
    this.linesContainerCrop = this.graph.select(".vzb-lc-lines-crop");
    this.linesContainer = this.graph.select(".vzb-lc-lines");
    this.labelsContainerCrop = this.graph.select(".vzb-lc-labels-crop");
    this.labelsContainer = this.graph.select(".vzb-lc-labels");

    this.dataWarningEl = this.graph.select(".vzb-data-warning");

    this.verticalNow = this.labelsContainer.select(".vzb-lc-vertical-now");
    this.tooltip = this.element.select(".vzb-tooltip");
    //            this.filterDropshadowEl = this.element.select('#vzb-lc-filter-dropshadow');
    this.projectionX = this.graph.select(".vzb-lc-projection-x");
    this.projectionY = this.graph.select(".vzb-lc-projection-y");

    this.entityLabels = this.labelsContainer.selectAll(".vzb-lc-entity");
    this.entityLines = this.linesContainer.selectAll(".vzb-lc-entity");
    this.totalLength_1 = {};

    this.TIMEDIM = this.model.marker.encoding.get("frame").data.concept;
    //this.KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    this.KEY = Symbol.for("key");
    //this.dataKeys = this.model.marker.getDataKeysPerHook();

    this.collisionResolver = collisionResolver()
      .selector(".vzb-lc-label")
      .value("valueY")
      .filter(function(d, time){
        return (d.valueX - time === 0 && !d.hidden)
      });
    
    //component events

    const conceptPropsY = this.model.marker.encoding.get("y").data.conceptProps;
    utils.setIcon(this.yInfoEl, iconQuestion)
      .select("svg").attr("width", "0px").attr("height", "0px")
      .style('opacity', Number(Boolean(conceptPropsY.description || conceptPropsY.sourceLink)));

    this.yInfoEl.on("click", () => {
      _this.parent.findChildByName("gapminder-datanotes").pin();
    });
    this.yInfoEl.on("mouseover", function() {
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      _this.parent.findChildByName("gapminder-datanotes").setHook("y").show().setPos(coord.x, coord.y);
    });
    this.yInfoEl.on("mouseout", () => {
      _this.parent.findChildByName("gapminder-datanotes").hide();
    });

    this.wScale = d3.scaleLinear()
    ////  .domain(this.model.ui.config.datawarning.doubtDomain)
    ////  .range(this.model.ui.config.datawarning.doubtRange);

    this.on("resize", () => {
      //return if updatesize exists with error
      if (_this.updateSize()) return;
      _this.updateTime();
      _this.redrawDataPoints();
    });
    this.graph.on("click", () => {
      if (this.model.marker.encoding.get("highlighted").data.filter.any()) {
        _this.model.marker.encoding.get("selected").data.filter.toggle(
          this.model.marker.encoding.get("highlighted").data.filter.markers.keys().next().value
        );
      }
    });
  },

  ready() {
    const _this = this;
    this.KEYS = this.model.marker.data.space.filter(dim => dim !== this.TIMEDIM);
    ////utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    //this.KEYS.join(",");
    ////this.dataKeys = this.model.marker.getDataKeysPerHook();

    this.all_steps = [...this.model.marker.encoding.get("frame").frameMap.keys()].sort(d3.ascending);
    ////this.model.time.getAllSteps();
    this.all_values = this.values = null;
    this.allNested = this.getNested();
    this.updateTime();
    this.updateUIStrings();
    this.updateIndicators();
      //this.updateShow();
    this.entityLines.remove();
    this.entityLabels.remove();
    //null means we need to calculate all frames before we get to the callback
    this.getFrame(null, allValues => {
      _this.all_values = allValues;
      _this.getFrame(this.model.marker.encoding.get("frame").value, values => {
        if (!_this._frameIsValid(values)) return;
        _this.values = values;
        _this.updateShow();
        if(_this.updateSize()) return;
        _this.updateDoubtOpacity();
        _this.zoomToMaxMin();
        _this.redrawDataPoints();
        _this.highlightLines();
        _this.linesContainerCrop
          .on("mousemove", _this.entityMousemove.bind(_this, null, null, _this))
          .on("mouseleave", _this.entityMouseout.bind(_this, null, null, _this));

      });
    });
  },

  _frameIsValid(frame) {
    return true;
    // // return !(!frame
    // // || Object.keys(frame.axis_y).length === 0
    // // || Object.keys(frame.axis_x).length === 0
    // // || Object.keys(frame.color).length === 0);
  },

  getNested() {
    const data = [...this.model.marker.dataMapCache.values()];
    const keySymbol = Symbol.for('key');
    const TIMEDIM = this.TIMEDIM;

    return d3.nest()
      .key(d => d[keySymbol])
      .sortValues((a, b) => d3.ascending(a[TIMEDIM], b[TIMEDIM]))
      .entries(data);
  },

  getFrame(time, cb) {
    return this.model.marker.encoding.get("frame").getFrame(time, cb);
  },

  getCompoundLabelText(labelObj, keys) {
    return keys.map(key => labelObj[key]).join(",");
  },

  updateUIStrings() {
    const _this = this;
    const conceptPropsY = _this.model.marker.encoding.get("y").data.conceptProps;
    const conceptPropsX = _this.model.marker.encoding.get("x").data.conceptProps;
    const conceptPropsC = _this.model.marker.encoding.get("color").data.conceptProps;
    this.translator = this.model.locale.getTFunction();

    this.strings = {
      title: {
        Y: conceptPropsY.name,
        X: conceptPropsX.name,
        C: conceptPropsC.name
      },
      unit: {
        Y: conceptPropsY.unit || "",
        X: conceptPropsX.unit || "",
        C: conceptPropsC.unit || ""
      }
    };

    // if (this.strings.unit.Y === "unit/" + this.model.marker.axis_y.which) this.strings.unit.Y = "";
    // if (this.strings.unit.X === "unit/" + this.model.marker.axis_x.which) this.strings.unit.X = "";
    // if (this.strings.unit.C === "unit/" + this.model.marker.color.which) this.strings.unit.C = "";

    // if (this.strings.unit.Y) this.strings.unit.Y = ", " + this.strings.unit.Y;
    // if (this.strings.unit.X) this.strings.unit.X = ", " + this.strings.unit.X;
    // if (this.strings.unit.C) this.strings.unit.C = ", " + this.strings.unit.C;

    utils.setIcon(this.dataWarningEl, iconWarn).select("svg").attr("width", "0px").attr("height", "0px");
    this.dataWarningEl.append("text")
      .attr("text-anchor", "end")
      .text(this.translator("hints/dataWarning"));

    this.dataWarningEl
      .on("click", () => {
        _this.parent.findChildByName("gapminder-datawarning").toggle();
      })
      .on("mouseover", () => {
        _this.updateDoubtOpacity(1);
      })
      .on("mouseout", () => {
        _this.updateDoubtOpacity();
      });

    let xTitle = this.xTitleEl.selectAll("text").data([0]);
    xTitle = xTitle.enter().append("text").merge(xTitle);

    let yTitle = this.yTitleEl.selectAll("text").data([0]);
    yTitle = yTitle.enter().append("text").merge(yTitle);
    yTitle
      .on("click", () => {
        _this.parent
          .findChildByName("gapminder-treemenu")
          .markerID("y")
          .alignX("left")
          .alignY("top")
          .updateView()
          .toggle();
      });

  },

  updateDoubtOpacity(opacity) {
    // // if (opacity == null) opacity = this.wScale(+this.time.getUTCFullYear().toString());
    // // if (this.someSelected) opacity = 1;
    // // this.dataWarningEl.style("opacity", opacity);
  },

  /*
   * UPDATE INDICATORS
   */
  updateIndicators() {
    const _this = this;
    const KEY = this.KEY;

    //scales
    this.yScale = this.model.marker.encoding.get("y").scale.d3Scale;
    if (!this.splash) {
      ////const limits = this.model.marker.axis_y.getLimits(this.model.marker.axis_y.which);
      ////this.yScale.domain([limits.min, limits.max]);
    }
    this.xScale = this.model.marker.encoding.get("x").scale.d3Scale;
    this.cScale = this.model.marker.encoding.get("color").scale.d3Scale;
    this.yAxis.tickFormat(this.model.marker.encoding.get("y").scale.tickFormatter);
    this.xAxis.tickFormat(this.model.marker.encoding.get("x").scale.tickFormatter);

    this.collisionResolver.scale(this.yScale)
      .KEY(KEY);  
  },

  /*
   * UPDATE SHOW:
   * Ideally should only update when show parameters change or data changes
   */
  updateShow() {
    const _this = this;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    const highlightConfig = this.model.marker.encoding.get("highlighted");

    this.cached = {};

    this.dataHash = {};
    this.data = this.allNested.map(d => ({[KEY]: d.key, values: d.values})).map(entity => {
      ////entity[KEY] = utils.getKey(entity, KEYS);
      this.dataHash[entity[KEY]] = entity;
      return entity;
    });
    this.linesContainer.selectAll(".vzb-lc-entity").remove();
    this.entityLines = this.linesContainer.selectAll(".vzb-lc-entity").data(this.data);

    this.lineWidth = this.lineWidthScale(this.data.length);
    if (this.lineWidth >= 2) {
      this.shadowWidth = this.lineWidth * 1.3;
    } else {
      this.shadowWidth = null;
    }
    this.labelsContainer.classed("small", !this.shadowWidth);
    this.entityLines = this.entityLines.enter().append("g")
      .attr("class", d => "vzb-lc-entity vzb-lc-entity-" + d[KEY])
      .each(function(d, index) {
        const entity = d3.select(this);
        if (_this.shadowWidth) {
          entity.append("path")
            .attr("class", "vzb-lc-line-shadow");
        } else {
          
        }

        entity.append("path")
          .attr("class", "vzb-lc-line");

      })
      .merge(this.entityLines);
    this.labelsContainer.selectAll(".vzb-lc-entity").remove();
    this.entityLabels = this.labelsContainer.selectAll(".vzb-lc-entity").data(this.data);
    this.entityLabels = this.entityLabels.enter().append("g")
      .attr("class", "vzb-lc-entity")
      .on("mouseover", d => {
        highlightConfig.data.filter.set(d);
      })
      .on("mouseout", d => {
        highlightConfig.data.filter.delete(d);
      })
      .each(function(d, index) {
        const entity = d3.select(this);

        entity.append("circle")
          .attr("class", "vzb-lc-circle")
          .attr("cx", 0);

        const labelGroup = entity.append("g").attr("class", "vzb-lc-label");

        labelGroup.append("text")
          .attr("class", "vzb-lc-labelname vzb-lc-labelstroke")
          .attr("dy", ".35em");

        labelGroup.append("text")
          .attr("class", "vzb-lc-labelname vzb-lc-labelfill")
          .attr("dy", ".35em");

        labelGroup.append("text")
          .attr("class", "vzb-lc-label-value")
          .attr("dy", "1.6em");
      })
      .merge(this.entityLabels);

    if (this.all_values && this.values) {
      this.entityLabels.each(function(d, index) {
        const entity = d3.select(this);
        const {color, colorShadow} = _this.getColorsByValue(_this.dataHash[d[KEY]].values[0].color);
        
        const label = _this.getCompoundLabelText(_this.dataHash[d[KEY]].values[0].label, KEYS);
        const value = _this.yAxis.tickFormat()((_this.values.get(d[KEY]) || {}).y);
        const name = label.length < 13 ? label : label.substring(0, 10) + "...";//"…";
        const valueHideLimit = _this.model.ui.config.chart.labels.min_number_of_entities_when_values_hide;

        entity.select("circle").style("fill", color);
        entity.selectAll(".vzb-lc-labelname")
          .text(name + " " + (_this.data.length < valueHideLimit ? value : ""))
        entity.select(".vzb-lc-labelfill")
          .style("fill", colorShadow)
        entity.append("title").text(label + " " + value);

        entity.select(".vzb-lc-label-value")
          .style("fill", colorShadow);

      });
    }

    //line template
    this.line = d3.line()
    //see https://bl.ocks.org/mbostock/4342190
    //"monotone" can also work. "basis" would skip the points on the sharp turns. "linear" is ugly
      .curve(d3[this.model.ui.config.chart.curve || "curveMonotoneX"])
      .x(d => _this.xScale(d[0]))
      .y(d => _this.yScale(d[1]));
  },

  getColorsByValue(colorValue) {
    return { 
      color: colorValue != null ? this.cScale(colorValue) : this.COLOR_WHITEISH,
      colorShadow: colorValue != null ? this.model.marker.encoding.get("color").getColorShade({
          colorID: colorValue,
          shadeID: "shade"
        }) : this.COLOR_WHITEISH_SHADE
    }
  },

  updateColors() {
    const _this = this;
    const KEY = this.KEY;
     
    //const dataKeys = this.dataKeys = this.model.marker.getDataKeysPerHook();
    //const valuesColor = this.values.color;
    
    this.cScale = this.model.marker.encoding.get("color").scale.d3Scale;
    
    this.entityLabels.each(function(d, index) {
      const entity = d3.select(this);
      //const {color, colorShadow} = _this.getColorsByValue(valuesColor[utils.getKey(d, dataKeys.color)]);
      const {color, colorShadow} = _this.getColorsByValue(_this.dataHash[d[KEY]].values[0].color);

      entity.select("circle").style("fill", color);
      entity.select(".vzb-lc-labelfill")
        .style("fill", colorShadow)
      entity.select(".vzb-lc-label-value")
        .style("fill", colorShadow);
    });

    this.entityLines.each(function(d, index) {
      const entity = d3.select(this);
      //const {color, colorShadow} = _this.getColorsByValue(valuesColor[utils.getKey(d, dataKeys.color)]);
      const {color, colorShadow} = _this.getColorsByValue(_this.dataHash[d[KEY]].values[0].color);
      
      entity.select(".vzb-lc-line").style("stroke", color);
      entity.select(".vzb-lc-line-shadow").style("stroke", colorShadow);
    });
  },
  /*
   * UPDATE TIME:
   * Ideally should only update when time or data changes
   */
  updateTime() {
    const _this = this;
    const KEY = this.KEY;

    const frameConfig = this.model.marker.encoding.get("frame");
    const time_1 = (this.time === null) ? frameConfig.value : this.time;
    this.time = frameConfig.value;
    this.duration = frameConfig.playing && (this.time - time_1 > 0) ? frameConfig.speed || 0 : 0;

    const timeDim = frameConfig.data.concept
    const filter = {};

    filter[timeDim] = this.time;

    this.prev_steps = this.all_steps.filter(f => f < _this.time);

    this.timeUpdatedOnce = true;
  },

  profiles: {
    "small": {
      margin: {
        top: 30,
        right: 20,
        left: 40,
        bottom: 20
      },
      infoElHeight: 16,
      yAxisTitleBottomMargin: 6,
      tick_spacing: 60,
      text_padding: 12,
      lollipopRadius: 6,
      limitMaxTickNumberX: 5
    },
    "medium": {
      margin: {
        top: 40,
        right: 60,
        left: 60,
        bottom: 25
      },
      infoElHeight: 20,
      yAxisTitleBottomMargin: 6,
      tick_spacing: 80,
      text_padding: 15,
      lollipopRadius: 7,
      limitMaxTickNumberX: 10
    },
    "large": {
      margin: {
        top: 50,
        right: 60,
        left: 75,
        bottom: 30
      },
      infoElHeight: 22,
      yAxisTitleBottomMargin: 6,
      tick_spacing: 100,
      text_padding: 20,
      lollipopRadius: 9,
      limitMaxTickNumberX: 0 // unlimited
    }
  },
  presentationProfileChanges: {
    "medium": {
      margin: { top: 70, bottom: 40, left: 70 },
      yAxisTitleBottomMargin: 20,
      xAxisTitleBottomMargin: 20,
      infoElHeight: 26,
      text_padding: 30
    },
    "large": {
      margin: { top: 70, bottom: 50, left: 70 },
      yAxisTitleBottomMargin: 20,
      xAxisTitleBottomMargin: 20,
      infoElHeight: 32,
      text_padding: 36,
      hideSTitle: true
    }
  },

  timeSliderProfiles: {
    small: {
      margin: {
        top: 7,
        right: 15,
        bottom: 10,
        left: 60
      }
    },
    medium: {
      margin: {
        top: 10,
        right: 15,
        bottom: 10,
        left: 60
      }
    },
    large: {
      margin: {
        top: 5,
        right: 15,
        bottom: 10,
        left: 75
      }
    }
  },

  /*
   * RESIZE:
   * Executed whenever the container is resized
   * Ideally, it contains only operations related to size
   */
  updateSize() {

    const _this = this;
    //const values = this.values;
    //const KEY = this.KEY;
    const isRTL = this.model.locale.isRTL();

    const padding = 2;

    this.activeProfile = this.getActiveProfile(this.profiles, this.presentationProfileChanges);
    this.margin = this.activeProfile.margin;
    this.tick_spacing = this.activeProfile.tick_spacing;

    const infoElHeight = this.activeProfile.infoElHeight;

    //adjust right this.margin according to biggest label

    let longestLabelWidth = 0;

    this.entityLabels.selectAll(".vzb-lc-labelname")
      .attr("dx", _this.activeProfile.text_padding)
      .each(function(d, index) {
        const width = this.getComputedTextLength();
        if (width > longestLabelWidth) longestLabelWidth = width;
      });

    this.entityLabels.selectAll(".vzb-lc-circle")
      .attr("r", this.shadowWidth ? _this.activeProfile.lollipopRadius : _this.activeProfile.lollipopRadius * 0.8);

    const magicMargin = 20;
    this.margin.right = Math.max(this.margin.right, longestLabelWidth + this.activeProfile.text_padding + magicMargin);

    //stage
    this.height = (parseInt(this.element.style("height"), 10) - this.margin.top - this.margin.bottom) || 0;
    this.width = (parseInt(this.element.style("width"), 10) - this.margin.left - this.margin.right) || 0;

    if (this.height <= 0 || this.width <= 0) return utils.warn("Line chart updateSize() abort: vizabi container is too little or has display:none");

    this.linesContainerCrop
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    this.labelsContainerCrop
      .attr("width", this.width + this.margin.right)
      .attr("height", Math.max(0, this.height));

    this.collisionResolver.height(this.height);

    this.graph
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.yScale.range([this.height - this.activeProfile.lollipopRadius, this.activeProfile.lollipopRadius]);
    this.xScale.range([this.rangeXShift, this.width * this.rangeXRatio + this.rangeXShift]);


    this.yAxis.scale(this.yScale)
      .tickSizeInner(-this.width)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.width, 0)
      .labelerOptions({
        scaleType: this.model.marker.encoding.get("y").scale.type,
        toolMargin: this.margin,
        limitMaxTickNumber: 6,
        viewportLength: this.height,
        formatter: this.model.marker.encoding.get("x").scale.tickFormatter
      });

    this.xAxis.scale(this.xScale)
      .tickSizeInner(-this.height)
      .tickSizeOuter(0)
      .tickSizeMinor(-this.height, 0)
      .tickPadding(6)
      .labelerOptions({
        scaleType: this.model.marker.encoding.get("x").scale.type,
        limitMaxTickNumber: this.activeProfile.limitMaxTickNumberX,
        toolMargin: this.margin,
        bump: this.activeProfile.text_padding * 2,
        formatter: this.model.marker.encoding.get("x").scale.tickFormatter,
        //showOuter: true
      });

    this.xAxisElContainer
      .attr("width", this.width + this.activeProfile.text_padding * 2)
      .attr("height", this.activeProfile.margin.bottom + this.height)
      .attr("y", -1)
      .attr("x", -this.activeProfile.text_padding);

    this.xAxisEl
      .attr("transform", "translate(" + (this.activeProfile.text_padding - 1) + "," + (this.height + 1) + ")");

    this.yAxisElContainer
      .attr("width", this.activeProfile.margin.left + this.width)
      .attr("height", Math.max(0, this.height))
      .attr("x", -this.activeProfile.margin.left);
    this.yAxisEl
      .attr("transform", "translate(" + (this.activeProfile.margin.left - 1) + "," + 0 + ")");

    this.yAxisEl.call(this.yAxis);
    this.xAxisEl.call(this.xAxis);

    this.yTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" + (10 - this.activeProfile.margin.left + (isRTL ? infoElHeight * 1.4 : 0 )) + ", -" + this.activeProfile.yAxisTitleBottomMargin + ")");

    const yTitleText = this.yTitleEl.select("text").text(this.strings.title.Y + this.strings.unit.Y);
    if (yTitleText.node().getBBox().width > this.width) yTitleText.text(this.strings.title.Y);

    if (this.yInfoEl.select("svg").node()) {
      const titleBBox = this.yTitleEl.node().getBBox();
      const t = utils.transform(this.yTitleEl.node());

      this.yInfoEl.select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      this.yInfoEl.attr("transform", "translate("
        + (isRTL ? 10 - this.activeProfile.margin.left : titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4) + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }

    const warnBB = this.dataWarningEl.select("text").node().getBBox();
    this.dataWarningEl.select("svg")
      .attr("width", warnBB.height * 0.75)
      .attr("height", warnBB.height * 0.75)
      .attr("x", -warnBB.width - warnBB.height * 1.2)
      .attr("y", -warnBB.height * 0.65);

    this.dataWarningEl
      .attr("transform", "translate(" + (this.width + this.margin.right * 0.85) +
        ",-" + this.activeProfile.yAxisTitleBottomMargin + ")")
      .select("text");


    const xTitleText = this.xTitleEl.select("text").text(this.strings.title.X + this.strings.unit.X);

    this.xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", "translate(" +
        (this.width + this.activeProfile.text_padding + this.activeProfile.yAxisTitleBottomMargin) + "," +
        (this.height + xTitleText.node().getBBox().height  * 0.72) + ")");

    if (xTitleText.node().getBBox().width > this.width - 100) xTitleText.text(this.strings.title.X);

    // adjust the vertical dashed line
    this.verticalNow.attr("y1", this.yScale.range()[0]).attr("y2", this.yScale.range()[1])
      .attr("x1", 0).attr("x2", 0);
    this.projectionX.attr("y1", _this.yScale.range()[0]);
    this.projectionY.attr("x2", _this.xScale.range()[0]);

    if (utils.isTouchDevice()) {
      _this.tooltip.classed("vzb-hidden", true);
      _this.verticalNow.style("opacity", 1);
      _this.projectionX.style("opacity", 0);
      _this.projectionY.style("opacity", 0);
      _this.xAxisEl.call(_this.xAxis.highlightValue(_this.time));
      _this.yAxisEl.call(_this.yAxis.highlightValue("none"));
      _this.graph.selectAll(".vzb-lc-entity").each(function() {
        d3.select(this).classed("vzb-dimmed", false).classed("vzb-hovered", false);
      });

      _this.hoveringNow = null;
    }
    const opts = {
      rangeMax: this.xScale.range()[1],
      mRight: longestLabelWidth - magicMargin,
      profile: this.timeSliderProfiles[this.getLayoutProfile()]
    };
    ////this.parent.trigger("myEvent", opts);

    this.sizeUpdatedOnce = true;
  },

  /*
   * REDRAW DATA POINTS:
   * Here plotting happens
   */
  redrawDataPoints() {
    const _this = this;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    ////const dataKeys = this.dataKeys = this.model.marker.getDataKeysPerHook();
//    var values = this.values;

    if (!_this.all_values) return;
    this.getFrame(this.time, (values, time) => {

      if (!_this._frameIsValid(values)) return utils.warn("redrawDataPoints(): empty data received from marker.getFrame(). doing nothing");
      _this.values = values;
      if (!_this.timeUpdatedOnce) {
        _this.updateTime();
      }
      if (!_this.sizeUpdatedOnce) {
        _this.updateSize();
      }
      _this.updateDoubtOpacity();

      _this.entityLines
        .each(function(d, index) {
          const entity = d3.select(this);

          const {color, colorShadow} = _this.getColorsByValue(_this.dataHash[d[KEY]].values[0].color);
            
          //TODO: optimization is possible if getFrame would return both x and time
          //TODO: optimization is possible if getFrame would return a limited number of points, say 1 point per screen pixel
//          const startTime = new Date();

          const xy = _this.prev_steps.map((frame, i) => [frame, _this.all_values.has(frame) ? (_this.all_values.get(frame).get(d[KEY]) || {}).y || null : null])
            .filter(d => d[1] || d[1] === 0);
//          timer += new Date() - startTime;
          // add last point
          const currentY = (values.get(d[KEY]) || {}).y;
          if (currentY || currentY === 0) {
            xy.push([_this.time, currentY]);
          }

          if (xy.length > 0) {
            _this.cached[d[KEY]] = {
              valueX: xy[xy.length - 1][0],
              valueY: xy[xy.length - 1][1]
            };
          } else {
            delete _this.cached[d[KEY]];
          }

          // the following fixes the ugly line butts sticking out of the axis line
          //if(x[0]!=null && x[1]!=null) xy.splice(1, 0, [(+x[0]*0.99+x[1]*0.01), y[0]]);
          const path2 = entity.select(".vzb-lc-line");

          if (_this.model.marker.encoding.get("frame").playing && _this.totalLength_1[d[KEY]] === null) {
            _this.totalLength_1[d[KEY]] = path2.node().getTotalLength();
          }
          const line = _this.line(xy) || "";

          const path1 = entity.select(".vzb-lc-line-shadow")

            .style("stroke", colorShadow)
            .style("stroke-width", _this.shadowWidth + "px")
            .attr("transform", "translate(0, " + (_this.shadowWidth - _this.lineWidth) + ")")
            .attr("d", line);
          path2
          //.style("filter", "none")
            .style("stroke", color)
            .style("stroke-width", _this.lineWidth + "px")
            .attr("d", line);
          const totalLength = path2.node().getTotalLength();

          // this section ensures the smooth transition while playing and not needed otherwise
          if (_this.model.marker.encoding.get("frame").playing) {

            path1
              .interrupt()
              .attr("stroke-dasharray", totalLength)
              .attr("stroke-dashoffset", totalLength - _this.totalLength_1[d[KEY]])
              .transition()
              .delay(0)
              .duration(_this.duration)
              .ease(d3.easeLinear)
              .attr("stroke-dashoffset", 0);
            path2
              .interrupt()
              .attr("stroke-dasharray", totalLength)
              .attr("stroke-dashoffset", totalLength - _this.totalLength_1[d[KEY]])
              .transition()
              .delay(0)
              .duration(_this.duration)
              .ease(d3.easeLinear)
              .attr("stroke-dashoffset", 0);

            _this.totalLength_1[d[KEY]] = totalLength;
          } else {
            //reset saved line lengths
            _this.totalLength_1[d[KEY]] = null;

            path1
              .attr("stroke-dasharray", "none")
              .attr("stroke-dashoffset", "none");

            path2
              .attr("stroke-dasharray", "none")
              .attr("stroke-dashoffset", "none");
          }

        });

      _this.entityLabels
        .each(function(d, index) {
          const entity = d3.select(this);
          if (_this.cached[d[KEY]]) {
            d.valueX = _this.xScale(_this.cached[d[KEY]]["valueX"]);
            d.valueY = _this.yScale(_this.cached[d[KEY]]["valueY"]);
            entity
              .classed("vzb-hidden", false)
              .transition()
              .duration(_this.duration)
              .ease(d3.easeLinear)
              .attr("transform", "translate(" + d.valueX + ",0)");

            entity.select(".vzb-lc-circle")
              .transition()
              .duration(_this.duration)
              .ease(d3.easeLinear)
              .attr("cy", d.valueY + 1);

            if (_this.data.length < _this.model.ui.config.chart.labels.min_number_of_entities_when_values_hide * KEYS.length) {
              const label = _this.getCompoundLabelText(_this.dataHash[d[KEY]].values[0].label, KEYS);
              const value = _this.yAxis.tickFormat()(_this.cached[d[KEY]]["valueY"]);
              const name = label.length < 13 ? label : label.substring(0, 12) + "…";//"…";

              entity.selectAll(".vzb-lc-labelname")
                .text(name + " " + value);
            }

            entity.select(".vzb-lc-label")
              .transition()
              .duration(_this.duration)
              .ease(d3.easeLinear)
              .attr("transform", "translate(0," + d.valueY + ")");

          } else {
            entity
              .classed("vzb-hidden", true);
          }
        });
      _this.verticalNow
        .transition()
        .duration(_this.duration)
        .ease(d3.easeLinear)
        .attr("transform", "translate(" + _this.xScale(_this.time//d3.min([_this.model.marker.axis_x.getZoomedMax(), _this.time])
          ) + ",0)");


      if (!_this.hoveringNow && _this.time - _this.model.marker.encoding.get("frame").start !== 0) {
        if (!_this.model.ui.config.chart.hideXAxisValue) _this.xAxisEl.call(
          _this.xAxis
            .highlightTransDuration(_this.duration)
            .highlightValue(_this.time)
        );
        _this.verticalNow.style("opacity", 1);
      } else {
        if (!_this.model.ui.config.chart.hideXAxisValue) _this.xAxisEl.call(
          _this.xAxis
            .highlightValue("none")
        );
        _this.verticalNow.style("opacity", 0);
      }

      // Call flush() after any zero-duration transitions to synchronously flush the timer queue
      // and thus make transition instantaneous. See https://github.com/mbostock/d3/issues/1951
      if (_this.duration == 0) {
        d3.timerFlush();
      }

      // cancel previously queued simulation if we just ordered a new one
      // then order a new collision resolving
      clearTimeout(_this.collisionTimeout);
      _this.collisionTimeout = setTimeout(() => {
        _this.entityLabels.call(_this.collisionResolver.time(_this.xScale(_this.time)));
      }, _this.duration * 1.5);

    });
  },

  entityMousemove(me, index, context, closestToMouse) {
    const _this = context;
    const KEY = _this.KEY;
    const values = _this.values;

    const mouse = d3.mouse(_this.element.node()).map(d => parseInt(d));

    let resolvedTime = _this.xScale.invert(mouse[0] - _this.margin.left);
    if (_this.time - resolvedTime < 0) {
      resolvedTime = _this.time;
    } else if (resolvedTime < this.model.time["start"]) {
      resolvedTime = this.model.time["start"];
    }
    let resolvedValue;

    const mousePos = mouse[1] - _this.margin.top;

    if (!utils.isDate(resolvedTime)) resolvedTime = this.model.time.parse(resolvedTime);

    this.getFrame(resolvedTime, data => {
      if (!_this._frameIsValid(data)) return;
      //const nearestKey = _this.getNearestKey(_this.yScale.invert(mousePos), data.axis_y);
      const nearestKey = _this.getNearestKey(mousePos, _this.dataHash, utils.mapToObj(data), "y", _this.yScale.bind(_this));
      if (!data.has(nearestKey)) return;
      resolvedValue = data.get(nearestKey)["y"];
      me = _this.dataHash[nearestKey];
      const highlightedEnc = _this.model.marker.encoding.get("highlighted");
      if (!highlightedEnc.data.filter.has(me)) {
        highlightedEnc.data.filter.clear();
        highlightedEnc.data.filter.set(me);
      }
      _this.hoveringNow = me;

      if (utils.isNaN(resolvedValue)) return;

      const scaledTime = _this.xScale(resolvedTime);
      const scaledValue = _this.yScale(resolvedValue);

      if (_this.model.ui.config.chart.whenHovering.showTooltip) {
        //position tooltip
        _this.tooltip
        //.style("right", (_this.width - scaledTime + _this.margin.right ) + "px")
          .style("left", (scaledTime + _this.margin.left) + "px")
          .style("bottom", (_this.height - scaledValue + _this.margin.bottom) + "px")
          .text(_this.yAxis.tickFormat()(resolvedValue))
          .classed("vzb-hidden", false);
      }

      // bring the projection lines to the hovering point
      if (_this.model.ui.config.chart.whenHovering.hideVerticalNow) {
        _this.verticalNow.style("opacity", 0);
      }

      if (_this.model.ui.config.chart.whenHovering.showProjectionLineX) {
        _this.projectionX
          .style("opacity", 1)
          .attr("y2", scaledValue)
          .attr("x1", scaledTime)
          .attr("x2", scaledTime);
      }
      if (_this.model.ui.config.chart.whenHovering.showProjectionLineY) {
        _this.projectionY
          .style("opacity", 1)
          .attr("y1", scaledValue)
          .attr("y2", scaledValue)
          .attr("x1", scaledTime);
      }

      if (_this.model.ui.config.chart.whenHovering.higlightValueX) _this.xAxisEl.call(
        _this.xAxis.highlightValue(resolvedTime).highlightTransDuration(0)
      );

      if (_this.model.ui.config.chart.whenHovering.higlightValueY) _this.yAxisEl.call(
        _this.yAxis.highlightValue(resolvedValue).highlightTransDuration(0)
      );

      clearTimeout(_this.unhoverTimeout);

    });
  },

  entityMouseout(me, index, context) {
    const _this = context;
    if (d3.event.relatedTarget && d3.select(d3.event.relatedTarget).classed("vzb-tooltip")) return;

    // hide and show things like it was before hovering
    _this.unhoverTimeout = setTimeout(() => {
      _this.tooltip.classed("vzb-hidden", true);
      _this.verticalNow.style("opacity", 1);
      _this.projectionX.style("opacity", 0);
      _this.projectionY.style("opacity", 0);
      _this.xAxisEl.call(_this.xAxis.highlightValue(_this.time));
      _this.yAxisEl.call(_this.yAxis.highlightValue("none"));

      _this.model.marker.encoding.get("highlighted").data.filter.clear();

      _this.hoveringNow = null;
    }, 300);

  },

  /*
   * Highlights all hovered lines
   */
  highlightLines() {
    const _this = this;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = 0.3;
    const OPACITY_SELECT = 1.0;
    const OPACITY_REGULAR = this.model.ui.config.opacityRegular;
    const OPACITY_SELECT_DIM = this.model.ui.config.opacitySelectDim;
    const selectedConfig = this.model.marker.encoding.get("selected");
    const highlightConfig = this.model.marker.encoding.get("highlighted");

    const someHighlighted = (highlightConfig.data.filter.any());
    this.someSelected = (selectedConfig.data.filter.any());

    // when pointer events need update...

    this.nonSelectedOpacityZero = OPACITY_SELECT_DIM < 0.01;
    const selected = {};
    selectedConfig.data.filter.markers.forEach((v, k) => {
        selected[k] = true;
      }
    );
//    const startTime = new Date();
    this.entityLines.style("opacity", (d) => {
      if (highlightConfig.data.filter.has(d)) return OPACITY_HIGHLT;
      if (_this.someSelected) {
        return selected[d[KEY]] ? OPACITY_SELECT : OPACITY_SELECT_DIM;
      }
      if (someHighlighted) return OPACITY_HIGHLT_DIM;
      return OPACITY_REGULAR;
    });
    this.entityLabels.style("opacity", (d) => {
      if (highlightConfig.data.filter.has(d)) {
        d.sortValue = 1;
        return OPACITY_HIGHLT;
      } else {
        d.sortValue = 0;
      }
      if (_this.someSelected) {
        return selected[d[KEY]] ? OPACITY_SELECT : OPACITY_SELECT_DIM;
      }
      if (someHighlighted) return OPACITY_HIGHLT_DIM;
      return OPACITY_REGULAR;
    }).attr("pointer-events", d => {
      if(!_this.someSelected || !_this.nonSelectedOpacityZero || selected[d[KEY]]) {
        d.hidden = false;
        return "visible";   
      } else {
        d.hidden = true;
        return "none";
      }
    })
    .sort(function(x, y){
      return d3.ascending(x.sortValue, y.sortValue);
    });
/*
//    const startTime = new Date();
//    console.log(new Date() - startTime);
    this.graph.selectAll(".vzb-lc-entity").each(function() {
      d3.select(this)
        .style("opacity", d => {
          if (_this.model.marker.isHighlighted(d)) return OPACITY_HIGHLT;
          if (_this.someSelected) {
            return selected[d[KEY]] ? OPACITY_SELECT : OPACITY_SELECT_DIM;
          }
          if (someHighlighted) return OPACITY_HIGHLT_DIM;
          return OPACITY_REGULAR;
        })
    });
*/

  },

  zoomToMaxMin() { 
    return;
    if (
      this.model.marker.axis_x.getZoomedMin() != null &&
      this.model.marker.axis_x.getZoomedMax() != null) {
      this.xScale.domain([this.model.marker.axis_x.getZoomedMin(), this.model.marker.axis_x.getZoomedMax()]);
      this.xAxisEl.call(this.xAxis);
    }

    if (
      this.model.marker.axis_y.getZoomedMin() != null &&
      this.model.marker.axis_y.getZoomedMax() != null) {
      if ((this.model.marker.axis_y.getZoomedMin() <= 0 || this.model.marker.axis_y.getZoomedMax() <= 0)
        && this.model.marker.axis_y.scaleType == "log") {
        this.yScale = d3.scaleGenericlog()
          .domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()])
          .range(this.yScale.range());
        this.model.marker.axis_y.scale = d3.scaleGenericlog()
          .domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()])
          .range(this.yScale.range());
        this.yScale = this.model.marker.axis_y.scale;
      } else {
        this.yScale.domain([this.model.marker.axis_y.getZoomedMin(), this.model.marker.axis_y.getZoomedMax()]);
      }
      this.yAxisEl.call(this.yAxis);
    }
  },


  /**
   * Returns key from obj which value from values has the smallest difference with val
   */
  getNearestKey(val, obj, values, propName, fn) {
    //const startTime = new Date();
    const KEYS = this.KEYS;
    let keys = Object.keys(values);

    if (this.someSelected && this.nonSelectedOpacityZero) {
      keys = [...this.model.marker.encoding.get("selected").data.filter.markers.keys()].filter(key => values[key]);
    }
    let resKey = keys[0];
    for (let i = 1; i < keys.length; i++) {
      let key = keys[i];
      
      if (Math.abs((fn ? fn(values[key][propName]) : values[key][propName]) - val) < Math.abs((fn ? fn(values[resKey][propName]) : values[resKey][propName]) - val)) {
        resKey = key;
      }
    }
    //console.log(new Date() - startTime);
    return resKey;
  }
});

export default LCComponent;
