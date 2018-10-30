import * as utils from "base/utils";
//d3.axisSmart

export default function axisSmart(_orient) {

  return (function d3_axis_smart(_super) {

    const VERTICAL = "vertical axis";
    const HORIZONTAL = "horizontal axis";
    const X = "labels stack side by side";
    const Y = "labels stack top to bottom";

    const OPTIMISTIC = "optimistic approximation: labels have different lengths";
    const PESSIMISTIC = "pessimistic approximation: all labels have the largest length";
    const DEFAULT_LOGBASE = 10;

    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }

    function axis(g) {
      const checkDmn = axis.scale().domain();
      const checkRng = axis.scale().range();
      if (!checkDmn[0] && checkDmn[0] !== 0 || !checkDmn[1] && checkDmn[1] !== 0
      || !checkRng[0] && checkRng[0] !== 0 || !checkRng[1] && checkRng[1] !== 0) {
        return utils.warn("d3.axisSmart() skips action because of invalid domain " + JSON.stringify(checkDmn) + " or range " + JSON.stringify(checkRng) + " of the attached scale");
      }

      if (highlightValue != null) {
        axis.highlightValueRun(g);
        return;
      }

      // measure the width and height of one digit
      const widthSampleG = g.append("g").attr("class", "tick widthSampling");
      const widthSampleT = widthSampleG.append("text").text("0");
      if (!options.cssMargin) options.cssMargin = {};
      options.cssMargin.top = widthSampleT.style("margin-top");
      options.cssMargin.bottom = widthSampleT.style("margin-bottom");
      options.cssMargin.left = widthSampleT.style("margin-left");
      options.cssMargin.right = widthSampleT.style("margin-right");
      options.widthOfOneDigit = widthSampleT.node().getBBox().width;
      options.heightOfOneDigit = widthSampleT.node().getBBox().height;
      widthSampleG.remove();

      // run label factory - it will store labels in tickValues property of axis
      axis.labelFactory(options);

      // construct the view (d3 constructor is used)
      let transition = null;
      if (options.transitionDuration > 0) {
        _super(transition = g.transition().duration(options.transitionDuration));
      } else {
        _super(g);
      }

      //remove axis d3v4 hardcoded attributes
      g.attr("fill", null);
      g.attr("font-size", null);
      g.attr("font-family", null);
      g.attr("text-anchor", null);

      //identify the orientation of axis and the direction of labels
      const orient = axis.orient() == "top" || axis.orient() == "bottom" ? HORIZONTAL : VERTICAL;
      const dimension = (orient == HORIZONTAL && axis.pivot() || orient == VERTICAL && !axis.pivot()) ? Y : X;

      //add an invisible element that would represent hovered value
      g.selectAll(".vzb-axis-value")
        .data([null])
        .enter().append("g")
        .attr("class", "vzb-axis-value")
        .classed("vzb-hidden", true)
        .append("text");

      // patch the label positioning after the view is generated
      const padding = axis.tickPadding();
      g.selectAll("text")
        .each(function(d, i) {
          if (axis.pivot() == null) return;

          const view = d3.select(this);
          view.attr("transform", "rotate(" + (axis.pivot() ? -90 : 0) + ")");
          view.style("text-anchor", dimension == X ? "middle" : "end");
          view.attr("x", dimension == X ? (orient == VERTICAL ? -padding : 0) : -padding);
          view.attr("y", dimension == X ? (orient == VERTICAL ? 0 : padding) : 0);
          view.attr("dx", dimension == X ? (orient == VERTICAL ? padding : 0) : 0);
          view.attr("dy", dimension == X ? (orient == VERTICAL ? -padding : ".72em") : ".32em");
        });

      //apply label repositioning: first and last visible values would shift away from the borders
      if (axis.repositionLabels() != null) {
        const patchLabelsPosition = () => {
          g.selectAll(".tick")
            .each(function(d) {
              const view = d3.select(this).select("text");
              const shift = axis.repositionLabels()[d] || { x: 0, y: 0 };
              view.attr("x", +view.attr("x") + shift.x);
              view.attr("y", +view.attr("y") + shift.y);
            });
        };
        transition ? transition.on("end", () => patchLabelsPosition()) : patchLabelsPosition();
      }

      //hide axis labels that are outside the available viewport
      const scale = axis.scale();
      if (options.viewportLength) {
        g.selectAll(".tick")
          .classed("vzb-hidden", d => scale(d) < 0 || scale(d) > options.viewportLength);
      }

      // add minor ticks. if none exist add an empty array
      if (axis.tickValuesMinor() == null) axis.tickValuesMinor([]);
      let minorTicks = g.selectAll(".tick-minor").data(tickValuesMinor);
      minorTicks.exit().remove();
      minorTicks = minorTicks.enter().append("line")
        .attr("class", "tick-minor")
        .merge(minorTicks);

      const tickLengthOut = axis.tickSizeMinor().outbound;
      const tickLengthIn = axis.tickSizeMinor().inbound;
      minorTicks
        .classed("vzb-hidden", d => scale(d) < 0 || scale(d) > options.viewportLength)
        .attr("y1", orient == HORIZONTAL ? (axis.orient() == "top" ? 1 : -1) * tickLengthIn : scale)
        .attr("y2", orient == HORIZONTAL ? (axis.orient() == "top" ? -1 : 1) * tickLengthOut : scale)
        .attr("x1", orient == VERTICAL ? (axis.orient() == "right" ? -1 : 1) * tickLengthIn : scale)
        .attr("x2", orient == VERTICAL ? (axis.orient() == "right" ? 1 : -1) * tickLengthOut : scale);

      //adjust axis rake
      g.selectAll("path").remove();
      let rake = g.selectAll(".vzb-axis-line").data([0]);
      rake.exit().remove();
      rake = rake.enter().append("line")
        .attr("class", "vzb-axis-line")
        .merge(rake);

      if (options.viewportLength) {
        rake
          .attr("x1", orient == VERTICAL ? 0 : -1)
          .attr("x2", orient == VERTICAL ? 0 : options.viewportLength)
          .attr("y1", orient == HORIZONTAL ? 0 : 0)
          .attr("y2", orient == HORIZONTAL ? 0 : options.viewportLength);
      } else {
        //TODO: this will not work for the "ordinal" scaleType
        rake
          .attr("x1", orient == VERTICAL ? 0 : d3.min(scale.range()) - (options.bump || 0) - 1)
          .attr("x2", orient == VERTICAL ? 0 : d3.max(scale.range()) + (options.bump || 0))
          .attr("y1", orient == HORIZONTAL ? 0 : d3.min(scale.range()) - (options.bump || 0))
          .attr("y2", orient == HORIZONTAL ? 0 : d3.max(scale.range()) + (options.bump || 0));
      }
    }


    axis.highlightValueRun = function(g) {

      //if viewport is defined and HL value is outside then behave as reset HL
      if (options.viewportLength && highlightValue != "none" && (
        axis.scale()(highlightValue) > options.viewportLength ||
        axis.scale()(highlightValue) < 0
      )) highlightValue = "none";

      //identify the orientation of axis and the direction of labels
      const orient = axis.orient() == "top" || axis.orient() == "bottom" ? HORIZONTAL : VERTICAL;
      const dimension = (orient == HORIZONTAL && axis.pivot() || orient == VERTICAL && !axis.pivot()) ? "y" : "x";
      const pivot = axis.pivot() ? -1 : 1;

      //set content and visibility of HL value
      g.select(".vzb-axis-value")
        .classed("vzb-hidden", highlightValue == "none");

      let bbox;
      const o = {};

      if (highlightValue != "none") {
        // measure its width and height for collision resolving
        bbox = g.select(".vzb-axis-value").node().getBBox();

        // clone a known options object (because we don't want to overwrite widthOfOneDigit / heightOfOneDigit in the original one
        o.bump = options.bump;
        o.formatter = options.formatter;
        o.viewportLength = options.viewportLength;
        o.toolMargin = options.toolMargin;
        o.cssMargin = options.cssMargin;
        o.widthOfOneDigit = bbox[axis.pivot() ? "height" : "width"] / (options.formatter(highlightValue).length);
        o.heightOfOneDigit = bbox[axis.pivot() ? "width" : "height"];
      }

      // this will give additive shifting for the hovered value in case it sticks out a little outside viewport
      const hlValueShift = (highlightValue == "none" ? { x: 0, y: 0 } :
        repositionLabelsThatStickOut([highlightValue], o, orient, axis.scale(), dimension)[highlightValue])[dimension];

      // this function will help to move the hovered value to the right place
      const getTransform = function(d) {
        return highlightValue == "none" ? "translate(0,0)" :
          "translate("
            + (orient == HORIZONTAL ? axis.scale()(highlightValue) + hlValueShift * pivot : 0) + ","
            + (orient == VERTICAL ? axis.scale()(highlightValue) + hlValueShift * pivot : 0)
            + ")";
      };

      // this function will help to compute opacity for the axis labels that would overlap with the HL label
      const getOpacity = function(d, t, view) {
        if (highlightValue == "none") return 1;

        const wh = orient == HORIZONTAL ? "width" : "height";
        const shift = ((axis.repositionLabels() || {})[d] || { x: 0, y: 0 })[dimension];

        // opacity depends on the collision between label's boundary boxes
        return axis.hlOpacityScale()(
          // this computes the distance between the box centers, this is a 1-d problem because all labels are along the axis
          // shifts of labels that stick out from the viewport are also taken into account
          Math.abs(axis.scale()(d) + shift * pivot - axis.scale()(highlightValue) -  hlValueShift * pivot)
          // this computes the sides of boundary boxes, each has a half-size to reduce the distance between centers
          - view.getBBox()[wh] / 2 - bbox[wh] / 2
        );
      };

      // apply translation of the HL value and opacity of tick labels
      if (highlightTransDuration) {
        g.select(".vzb-axis-value")
          .transition()
          .duration(highlightTransDuration)
          .ease(d3.easeLinear)
          .attr("transform", getTransform);

        g.select(".vzb-axis-value")
          .select("text")
          .transition("text")
          .delay(highlightTransDuration)
          .text(highlightValue == "none" ? "" : options.formatter(highlightValue));

        g.selectAll(".tick:not(.vzb-hidden)").each(function(d, t) {
          d3.select(this).select("text")
            .transition()
            .duration(highlightTransDuration)
            .ease(d3.easeLinear)
            .style("opacity", getOpacity(d, t, this));
        });

      } else {
        g.select(".vzb-axis-value")
          .interrupt()
          .attr("transform", getTransform)
          .transition();

        g.select(".vzb-axis-value")
          .select("text")
          .interrupt("text")
          .text(highlightValue == "none" ? "" : options.formatter(highlightValue))
          .transition();

        g.selectAll(".tick:not(.vzb-hidden)").each(function(d, t) {
          d3.select(this).select("text")
            .interrupt()
            .style("opacity", getOpacity(d, t, this))
            .transition();
        });

      }

      highlightValue = null;
    };


    let hlOpacityScale = d3.scaleLinear().domain([0, 5]).range([0, 1]).clamp(true);
    axis.hlOpacityScale = function(arg) {
      if (!arguments.length) return hlOpacityScale;
      hlOpacityScale = arg;
      return axis;
    };

    let highlightValue = null;
    axis.highlightValue = function(arg) {
      if (!arguments.length) return highlightValue;
      highlightValue = arg;
      return axis;
    };

    let highlightTransDuration = 0;
    axis.highlightTransDuration = function(arg) {
      if (!arguments.length) return highlightTransDuration;
      highlightTransDuration = arg;
      return axis;
    };

    let repositionLabels = null;
    axis.repositionLabels = function(arg) {
      if (!arguments.length) return repositionLabels;
      repositionLabels = arg;
      return axis;
    };

    let pivot = false;
    axis.pivot = function(arg) {
      if (!arguments.length) return pivot;
      pivot = !!arg;
      return axis;
    };

    let tickValuesMinor = [];
    axis.tickValuesMinor = function(arg) {
      if (!arguments.length) return tickValuesMinor;
      tickValuesMinor = arg;
      return axis;
    };

    let tickSizeMinor = {
      outbound: 0,
      inbound: 0
    };
    axis.tickSizeMinor = function(arg1, arg2) {
      if (!arguments.length) return tickSizeMinor;
      tickSizeMinor = {
        outbound: arg1,
        inbound: arg2 || 0
      };
      meow("setting", tickSizeMinor);
      return axis;
    };

    let options = {};
    axis.labelerOptions = function(arg) {
      if (!arguments.length) return options;
      options = arg;
      return axis;
    };

    axis.METHOD_REPEATING = "repeating specified powers";
    axis.METHOD_DOUBLING = "doubling the value";

    axis.labelFactory = function(options) {
      if (options == null) options = {};
      if (options.scaleType != "linear" &&
        options.scaleType != "time" &&
        options.scaleType != "genericLog" &&
        options.scaleType != "log" &&
        options.scaleType != "ordinal") {
        return axis.ticks(options.limitMaxTickNumber)
          .tickFormat(null)
          .tickValues(null)
          .tickValuesMinor(null)
          .pivot(null)
          .repositionLabels(null);
      }
      if (options.scaleType == "ordinal") return axis;

      if (options.logBase == null) options.logBase = DEFAULT_LOGBASE;
      if (options.stops == null) options.stops = [1, 2, 5, 3, 7, 4, 6, 8, 9];


      if (options.removeAllLabels == null) options.removeAllLabels = false;

      if (options.formatter == null) options.formatter = axis.tickFormat() ?
        axis.tickFormat() : function(d) { return d + ""; };
      options.cssLabelMarginLimit = 5; //px

      if (options.cssMargin == null) options.cssMargin = {};
      if (options.cssMargin.left == null || parseInt(options.cssMargin.left) < options.cssLabelMarginLimit)
        options.cssMargin.left = options.cssLabelMarginLimit + "px";
      if (options.cssMargin.right == null || parseInt(options.cssMargin.right) < options.cssLabelMarginLimit)
        options.cssMargin.right = options.cssLabelMarginLimit + "px";
      if (options.cssMargin.top == null || parseInt(options.cssMargin.top) < options.cssLabelMarginLimit)
        options.cssMargin.top = options.cssLabelMarginLimit + "px";
      if (options.cssMargin.bottom == null || parseInt(options.cssMargin.bottom) < options.cssLabelMarginLimit)
        options.cssMargin.bottom = options.cssLabelMarginLimit + "px";
      if (options.toolMargin == null) options.toolMargin = {
        left: 30,
        bottom: 30,
        right: 30,
        top: 30
      };
      if (options.bump == null) options.bump = 0;
      if (options.viewportLength == null) options.viewportLength = 0;

      if (options.pivotingLimit == null) options.pivotingLimit = options.toolMargin[this.orient()];

      if (options.showOuter == null) options.showOuter = false;
      if (options.limitMaxTickNumber == null) options.limitMaxTickNumber = 0; //0 is unlimited

      const orient = this.orient() == "top" || this.orient() == "bottom" ? HORIZONTAL : VERTICAL;

      if (options.isPivotAuto == null) options.isPivotAuto = orient == VERTICAL;

      if (options.cssFontSize == null) options.cssFontSize = "13px";
      if (options.widthToFontsizeRatio == null) options.widthToFontsizeRatio = 0.75;
      if (options.heightToFontsizeRatio == null) options.heightToFontsizeRatio = 1.20;
      if (options.widthOfOneDigit == null) options.widthOfOneDigit =
        parseInt(options.cssFontSize) * options.widthToFontsizeRatio;
      if (options.heightOfOneDigit == null) options.heightOfOneDigit =
        parseInt(options.cssFontSize) * options.heightToFontsizeRatio;
      if (options.fitIntoScale == null || options.fitIntoScale == "pessimistic") options.fitIntoScale = PESSIMISTIC;
      if (options.fitIntoScale == "optimistic") options.fitIntoScale = OPTIMISTIC;


      meow("********** " + orient + " **********");

      const domain = axis.scale().domain();
      const range = axis.scale().range();
      const lengthDomain = Math.abs(domain[domain.length - 1] - domain[0]);
      const lengthRange = Math.abs(range[range.length - 1] - range[0]);

      const min = d3.min([domain[0], domain[domain.length - 1]]);
      const max = d3.max([domain[0], domain[domain.length - 1]]);
      const bothSidesUsed = ((options.scaleType == "linear" ? min < 0 : min <= 0) && max >= 0) && options.scaleType != "time";

      let tickValues = options.showOuter ? [min, max] : [];
      let tickValuesMinor = []; //[min, max];
      let ticksNumber = 5;

      function getBaseLog(x, base) {
        if (x == 0 || base == 0) {
          return 0;
        }
        if (base == null) base = options.logBase;
        return Math.log(x) / Math.log(base);
      }

      // estimate the longest formatted label in pixels
      const estLongestLabelLength =
        //take 17 sample values and measure the longest formatted label
        d3.max(d3.range(min, max, (max - min) / 17).concat(max).map(d => options.formatter(d).replace(".", "").length)) * options.widthOfOneDigit + parseInt(options.cssMargin.left);

      const pivot = options.isPivotAuto && (
        (estLongestLabelLength > options.pivotingLimit) && (orient == VERTICAL)
        ||
        !(estLongestLabelLength > options.pivotingLimit) && !(orient == VERTICAL)
      );

      const labelsStackOnTop = (orient == HORIZONTAL && pivot || orient == VERTICAL && !pivot);


      // conditions to remove labels altogether
      const labelsJustDontFit = (!labelsStackOnTop && options.heightOfOneDigit > options.pivotingLimit);
      if (options.removeAllLabels) return axis.tickValues([]);

      // return a single tick if have only one point in the domain
      if (min == max) return axis.tickValues([min]).ticks(1).tickFormat(options.formatter);


      // LABELS FIT INTO SCALE
      // measure if all labels in array tickValues can fit into the allotted lengthRange
      // approximationStyle can be OPTIMISTIC or PESSIMISTIC
      // in optimistic style the length of every label is added up and then we check if the total pack of symbols fit
      // in pessimistic style we assume all labels have the length of the longest label from tickValues
      // returns TRUE if labels fit and FALSE otherwise
      const labelsFitIntoScale = function(tickValues, lengthRange, approximationStyle, rescalingLabels) {
        if (tickValues == null || tickValues.length <= 1) return true;
        if (approximationStyle == null) approximationStyle = PESSIMISTIC;
        if (rescalingLabels == null) scaleType = "none";


        if (labelsStackOnTop) {
          //labels stack on top of each other. digit height matters
          return lengthRange >
            tickValues.length * (
              options.heightOfOneDigit +
            parseInt(options.cssMargin.top) +
            parseInt(options.cssMargin.bottom)
            );
        }

        //labels stack side by side. label width matters
        const marginsLR = parseInt(options.cssMargin.left) + parseInt(options.cssMargin.right);
        const maxLength = d3.max(tickValues.map(d => options.formatter(d).length));

        // log scales need to rescale labels, so that 9 takes more space than 2
        if (rescalingLabels == "log") {
          // sometimes only a fragment of axis is used. in this case we want to limit the scope to that fragment
          // yes, this is hacky and experimental
          lengthRange = Math.abs(axis.scale()(d3.max(tickValues)) - axis.scale()(d3.min(tickValues)));

          return lengthRange >
            d3.sum(tickValues.map(d => (
              options.widthOfOneDigit * (approximationStyle == PESSIMISTIC ? maxLength : options.formatter(
                d).length) + marginsLR
            )
            // this is a logarithmic rescaling of labels
            * (1 + Math.log(d.toString().replace(/([0.])/g, "")[0]) / Math.LN10)));

        }

        return lengthRange >
          tickValues.length * marginsLR + (approximationStyle == PESSIMISTIC ?
            options.widthOfOneDigit * tickValues.length * maxLength : 0) + (approximationStyle == OPTIMISTIC ?
            options.widthOfOneDigit * (
              tickValues.map(d => options.formatter(d)).join("").length
            ) : 0);
      };


      // COLLISION BETWEEN
      // Check is there is a collision between labels ONE and TWO
      // ONE is a value, TWO can be a value or an array
      // returns TRUE if collision takes place and FALSE otherwise
      const collisionBetween = function(one, two) {
        if (two == null || two.length == 0) return false;
        if (!(two instanceof Array)) two = [two];

        for (let i = 0; i < two.length; i++) {
          if (
            one != two[i] && one != 0 &&
            Math.abs(axis.scale()(one) - axis.scale()(two[i])) <
            (labelsStackOnTop ?
              (options.heightOfOneDigit) :
              (options.formatter(one).length + options.formatter(two[i]).length) * options.widthOfOneDigit / 2
            )
          ) return true;

        }
        return false;
      };

      if (options.scaleType == "genericLog" || options.scaleType == "log") {
        const eps = axis.scale().eps ? axis.scale().eps() : 0;

        const spawnZero = bothSidesUsed ? [0] : [];

        // check if spawn positive is needed. if yes then spawn!
        const spawnPos = max < eps ? [] : (
          d3.range(
            Math.floor(getBaseLog(Math.max(eps, min))),
            Math.ceil(getBaseLog(max)),
            1)
            .concat(Math.ceil(getBaseLog(max)))
            .map(d => Math.pow(options.logBase, d))
        );

        // check if spawn negative is needed. if yes then spawn!
        const spawnNeg = min > -eps ? [] : (
          d3.range(
            Math.floor(getBaseLog(Math.max(eps, -max))),
            Math.ceil(getBaseLog(-min)),
            1)
            .concat(Math.ceil(getBaseLog(-min)))
            .map(d => -Math.pow(options.logBase, d))
        );


        // automatic chosing of method if it's not explicitly defined
        if (options.method == null) {
          const coverage = bothSidesUsed ?
            Math.max(Math.abs(max), Math.abs(min)) / eps :
            Math.max(Math.abs(max), Math.abs(min)) / Math.min(Math.abs(max), Math.abs(min));
          options.method = 10 <= coverage && coverage <= 1024 ? this.METHOD_DOUBLING : this.METHOD_REPEATING;
        }


        //meow('spawn pos/neg: ', spawnPos, spawnNeg);


        if (options.method == this.METHOD_DOUBLING) {
          let doublingLabels = [];
          if (bothSidesUsed) tickValues.push(0);
          const avoidCollidingWith = [].concat(tickValues);

          // start with the smallest abs number on the scale, rounded to nearest nice power
          //var startPos = max<eps? null : Math.pow(options.logBase, Math.floor(getBaseLog(Math.max(eps,min))));
          //var startNeg = min>-eps? null : -Math.pow(options.logBase, Math.floor(getBaseLog(Math.max(eps,-max))));

          const startPos = max < eps ? null : 4 * spawnPos[Math.floor(spawnPos.length / 2) - 1];
          const startNeg = min > -eps ? null : 4 * spawnNeg[Math.floor(spawnNeg.length / 2) - 1];

          //meow('starter pos/neg: ', startPos, startNeg);

          if (startPos) {
            for (let l = startPos; l <= max; l *= 2) doublingLabels.push(l);
          }
          if (startPos) {
            for (let l = startPos / 2; l >= Math.max(min, eps); l /= 2) doublingLabels.push(l);
          }
          if (startNeg) {
            for (let l = startNeg; l >= min; l *= 2) doublingLabels.push(l);
          }
          if (startNeg) {
            for (let l = startNeg / 2; l <= Math.min(max, -eps); l /= 2) doublingLabels.push(l);
          }

          doublingLabels = doublingLabels
            .sort(d3.ascending)
            .filter(d => min <= d && d <= max);

          tickValuesMinor = tickValuesMinor.concat(doublingLabels);

          doublingLabels = groupByPriorities(doublingLabels, false); // don't skip taken values

          const tickValues_1 = tickValues;
          for (let j = 0; j < doublingLabels.length; j++) {

            // compose an attempt to add more axis labels
            const trytofit = tickValues_1.concat(doublingLabels[j])
              .filter(d => !collisionBetween(d, avoidCollidingWith))
              .filter(onlyUnique);

            // stop populating if labels don't fit
            if (!labelsFitIntoScale(trytofit, lengthRange, PESSIMISTIC, "none")) break;

            // apply changes if no blocking instructions
            tickValues = trytofit;
          }
        }


        if (options.method == this.METHOD_REPEATING) {

          let spawn = spawnZero.concat(spawnPos).concat(spawnNeg).sort(d3.ascending);

          options.stops.forEach((stop, i) => {
            tickValuesMinor = tickValuesMinor.concat(spawn.map(d => d * stop));
          });

          spawn = groupByPriorities(spawn);
          const avoidCollidingWith = spawnZero.concat(tickValues);

          let stopTrying = false;

          options.stops.forEach((stop, i) => {
            if (i == 0) {
              for (let j = 0; j < spawn.length; j++) {

                // compose an attempt to add more axis labels
                const trytofit = tickValues
                  .concat(spawn[j].map(d => d * stop))
                  // throw away labels that collide with "special" labels 0, min, max
                  .filter(d => !collisionBetween(d, avoidCollidingWith))
                  .filter(d => min <= d && d <= max)
                  .filter(onlyUnique);

                // stop populating if labels don't fit
                if (!labelsFitIntoScale(trytofit, lengthRange, PESSIMISTIC, "none")) break;

                // apply changes if no blocking instructions
                tickValues = trytofit;
              }

              // flatten the spawn array
              spawn = [].concat(...spawn);
            } else {
              if (stopTrying) return;

              // compose an attempt to add more axis labels
              const trytofit = tickValues
                .concat(spawn.map(d => d * stop))
                .filter(d => min <= d && d <= max)
                .filter(onlyUnique);

              // stop populating if the new composition doesn't fit
              if (!labelsFitIntoScale(trytofit, lengthRange, PESSIMISTIC, "log")) {
                stopTrying = true;
                return;
              }
              // stop populating if the number of labels is limited in options
              if (tickValues.length > options.limitMaxTickNumber && options.limitMaxTickNumber != 0) {
                stopTrying = true;
                return;
              }

              // apply changes if no blocking instructions
              tickValues = trytofit;
            }
          });


        } //method


      } //logarithmic


      if (options.scaleType == "linear" || options.scaleType == "time") {
        if (bothSidesUsed) tickValues.push(0);
        const avoidCollidingWith = [].concat(tickValues);

        if (labelsStackOnTop) {
          ticksNumber = Math.max(Math.floor(lengthRange / (options.heightOfOneDigit + parseInt(options.cssMargin.top))), 2);
        } else {
          ticksNumber = Math.max(Math.floor(lengthRange / estLongestLabelLength), 2);
        }

        // limit maximum ticks number
        if (options.limitMaxTickNumber != 0 && ticksNumber > options.limitMaxTickNumber) ticksNumber = options.limitMaxTickNumber;

        let addLabels = axis.scale().ticks(ticksNumber)
          .sort(d3.ascending)
          .filter(d => min <= d && d <= max);

        tickValuesMinor = tickValuesMinor.concat(addLabels);

        addLabels = groupByPriorities(addLabels, false);

        const tickValues_1 = tickValues;
        for (let j = 0; j < addLabels.length; j++) {

          // compose an attempt to add more axis labels
          const trytofit = tickValues_1.concat(addLabels[j])
            .filter(d => !collisionBetween(d, avoidCollidingWith))
            .filter(onlyUnique);

          // stop populating if labels don't fit
          if (!labelsFitIntoScale(trytofit, lengthRange, options.fitIntoScale, "none")) break;

          // apply changes if no blocking instructions
          tickValues = trytofit;
        }

        tickValues = tickValues //.concat(addLabels)
          .filter(d => !collisionBetween(d, avoidCollidingWith))
          .filter(onlyUnique);


      }


      if (tickValues != null && tickValues.length <= 2 && !bothSidesUsed) {
        //remove min tick if min, max ticks have collision between them
        tickValues = Math.abs(axis.scale()(min) - axis.scale()(max)) < (labelsStackOnTop ?
          (options.heightOfOneDigit) :
          (options.formatter(min).length + options.formatter(max).length) * options.widthOfOneDigit) ? [max] : [min, max];
        if (tickValues.length == 1 && (options.scaleType == "linear" || options.scaleType == "time")) {
          tickValuesMinor = [];
        }
      }

      if (tickValues != null && tickValues.length <= 3 && bothSidesUsed) {
        if (!collisionBetween(0, [min, max])) {
          tickValues = [min, 0, max];
        } else {
          tickValues = [min, max];
        }
      }

      if (tickValues != null) tickValues.sort((a, b) => (orient == HORIZONTAL ? -1 : 1) * (axis.scale()(b) - axis.scale()(a)));

      if (labelsJustDontFit) tickValues = [];
      tickValuesMinor = tickValuesMinor.filter(d => tickValues.indexOf(d) == -1 && min <= d && d <= max);


      meow("final result", tickValues);

      return axis
        .ticks(ticksNumber)
        .tickFormat(options.formatter)
        .tickValues(tickValues)
        .tickValuesMinor(tickValuesMinor)
        .pivot(pivot)
        .repositionLabels(
          repositionLabelsThatStickOut(tickValues, options, orient, axis.scale(), labelsStackOnTop ? "y" : "x")
        );
    };


    // GROUP ELEMENTS OF AN ARRAY, SO THAT...
    // less-prio elements are between the high-prio elements
    // Purpose: enable adding axis labels incrementally, like this for 9 labels:
    // PRIO 1: +--------, concat result: +-------- first we show only 1 label
    // PRIO 2: ----+---+, concat result: +---+---+ then we add 2 more, that are maximally spaced
    // PRIO 3: --+---+--, concat result: +-+-+-+-+ then we fill spaces with 2 more labels
    // PRIO 4: -+-+-+-+-, concat result: +++++++++ then we fill the remaing spaces and show all labels
    // exception: zero jumps to the front, if it's on the list
    // example1: [1 2 3 4 5 6 7] --> [[1][4 7][2 3 5 6]]
    // example2: [1 2 3 4 5 6 7 8 9] --> [[1][5 9][3 7][2 4 6 8]]
    // example3: [-4 -3 -2 -1 0 1 2 3 4 5 6 7] --> [[0][-4][2][-1 5][-3 -2 1 3 4 6 7]]
    // inputs:
    // array - the source array to be processed. Only makes sense if sorted
    // removeDuplicates - return incremental groups (true, default), or return concatinated result (false)
    // returns:
    // the nested array
    function groupByPriorities(array, removeDuplicates) {
      if (removeDuplicates == null) removeDuplicates = true;

      const result = [];
      const taken = [];

      //zero is an exception, if it's present we manually take it to the front
      if (array.indexOf(0) != -1) {
        result.push([0]);
        taken.push(array.indexOf(0));
      }

      for (let k = array.length; k >= 1; k = k < 4 ? k - 1 : k / 2) {
        // push the next group of elements to the result
        result.push(array.filter((d, i) => {
          if (i % Math.floor(k) == 0 && (taken.indexOf(i) == -1 || !removeDuplicates)) {
            taken.push(i);
            return true;
          }
          return false;
        }));
      }

      return result;
    }


    // REPOSITION LABELS THAT STICK OUT
    // Purpose: the outer labels can easily be so large, they stick out of the allotted area
    // Example:
    // Label is fine:    Label sticks out:    Label sticks out more:    Solution - label is shifted:
    //      12345 |           1234|                123|5                   12345|
    // _______.   |      _______. |           _______.|                 _______.|
    //
    // this is what the function does on the first step (only outer labels)
    // on the second step it shifts the inner labels that start to overlap with the shifted outer labels
    //
    // requires tickValues array to be sorted from tail-first
    // tail means left or bottom, head means top or right
    //
    // dimension - which dimension requires shifting
    // X if labels stack side by side, Y if labels stack on top of one another
    //
    // returns the array of recommended {x,y} shifts

    function repositionLabelsThatStickOut(tickValues, options, orient, scale, dimension) {
      if (!tickValues) return null;
      const result = {};

      // make an abstraction layer for margin sizes
      // tail means left or bottom, head means top or right
      const margin =
        orient == VERTICAL ? {
          head: options.toolMargin.top,
          tail: options.toolMargin.bottom
        } : {
          head: options.toolMargin.right,
          tail: options.toolMargin.left
        };

      let range = scale.range();
      let bump = options.bump;

      //when a viewportLength is given: adjust outer VISIBLE tick values
      //this is helpful when the scaled is zoomed, so labels don't get truncated by a viewport svg
      if (options.viewportLength) {
        //remove invisible ticks from the array
        tickValues = tickValues.filter(d => scale(d) >= 0 && scale(d) <= options.viewportLength);
        //overwrite the available range with viewport limits. direction doesn't matter because we take min-max later anyway
        range = [0, options.viewportLength];
        //reset the bump because zoomed axis has no bump
        bump = 0;
      }

      // STEP 1:
      // for outer labels: avoid sticking out from the tool margin
      tickValues.forEach((d, i) => {
        if (i != 0 && i != tickValues.length - 1) return;

        // compute the influence of the axis head
        let repositionHead = Math.min(margin.head, options.widthOfOneDigit * 0.5) + bump
          + (orient == HORIZONTAL ? 1 : 0) * d3.max(range)
          - (orient == HORIZONTAL ? 0 : 1) * d3.min(range)
          + (orient == HORIZONTAL ? -1 : 1) * scale(d)
          - (dimension == "x") * options.formatter(d).length * options.widthOfOneDigit / 2
          - (dimension == "y") * options.heightOfOneDigit / 2
          // we may consider or not the label margins to give them a bit of spacing from the edges
          - (dimension == "x") * parseInt(options.cssMargin.right)
          - (dimension == "y") * parseInt(options.cssMargin.top);

        // compute the influence of the axis tail
        let repositionTail = Math.min(margin.tail, options.widthOfOneDigit * 0.5) + bump
          + (orient == VERTICAL ? 1 : 0) * d3.max(range)
          - (orient == VERTICAL ? 0 : 1) * d3.min(range)
          + (orient == VERTICAL ? -1 : 1) * scale(d)
          - (dimension == "x") * options.formatter(d).length * options.widthOfOneDigit / 2
          - (dimension == "y") * options.heightOfOneDigit / 2
          // we may consider or not the label margins to give them a bit of spacing from the edges
          - (dimension == "x") * parseInt(options.cssMargin.left)
          - (dimension == "y") * parseInt(options.cssMargin.bottom);

        // apply limits in order to cancel repositioning of labels that are good
        if (repositionHead > 0) repositionHead = 0;
        if (repositionTail > 0) repositionTail = 0;

        // add them up with appropriate signs, save to the axis
        result[d] = { x: 0, y: 0 };
        result[d][dimension] = (dimension == "y" && orient == VERTICAL ? -1 : 1) * (repositionHead - repositionTail);
      });


      // STEP 2:
      // for inner labels: avoid collision with outer labels
      tickValues.forEach((d, i) => {
        if (i == 0 || i == tickValues.length - 1) return;

        // compute the influence of the head-side outer label
        let repositionHead =
          // take the distance between head and the tick at hand
          Math.abs(scale(d) - scale(tickValues[tickValues.length - 1]))

          // substract the shift of the head TODO: THE SIGN CHOICE HERE MIGHT BE WRONG. NEED TO TEST ALL CASES
          - (dimension == "y") * (orient == HORIZONTAL ? -1 : 1) * result[tickValues[tickValues.length - 1]][dimension]
          - (dimension == "x") * (orient == HORIZONTAL ? 1 : -1) * result[tickValues[tickValues.length - 1]][dimension]

          // substract half-length of the overlapping labels
          - (dimension == "x") * options.widthOfOneDigit / 2 * options.formatter(d).length
          - (dimension == "x") * options.widthOfOneDigit / 2 * options.formatter(tickValues[tickValues.length - 1]).length
          - (dimension == "y") * options.heightOfOneDigit * 0.7 //TODO remove magic constant - relation of actual font height to BBox-measured height

          // we may consider or not the label margins to give them a bit of spacing from the edges
          - (dimension == "x") * parseInt(options.cssMargin.left)
          - (dimension == "y") * parseInt(options.cssMargin.bottom);

        // compute the influence of the tail-side outer label
        let repositionTail =
          // take the distance between tail and the tick at hand
          Math.abs(scale(d) - scale(tickValues[0]))

          // substract the shift of the tail TODO: THE SIGN CHOICE HERE MIGHT BE WRONG. NEED TO TEST ALL CASES
          - (dimension == "y") * (orient == VERTICAL ? -1 : 1) * result[tickValues[0]][dimension]
          - (dimension == "x") * (orient == VERTICAL ? 1 : -1) * result[tickValues[0]][dimension]

          // substract half-length of the overlapping labels
          - (dimension == "x") * options.widthOfOneDigit / 2 * options.formatter(d).length
          - (dimension == "x") * options.widthOfOneDigit / 2 * options.formatter(tickValues[0]).length
          - (dimension == "y") * options.heightOfOneDigit * 0.7 //TODO remove magic constant - relation of actual font height to BBox-measured height

          // we may consider or not the label margins to give them a bit of spacing from the edges
          - (dimension == "x") * parseInt(options.cssMargin.left)
          - (dimension == "y") * parseInt(options.cssMargin.bottom);

        // apply limits in order to cancel repositioning of labels that are good
        if (repositionHead > 0) repositionHead = 0;
        if (repositionTail > 0) repositionTail = 0;

        // add them up with appropriate signs, save to the axis
        result[d] = { x: 0, y: 0 };
        result[d][dimension] = (dimension == "y" && orient == VERTICAL ? -1 : 1) * (repositionHead - repositionTail);
      });


      return result;
    } // function repositionLabelsThatStickOut()


    axis.copy = function() {
      return d3_axis_smart(d3["axis" + utils.capitalize(_orient)]());
    };

    axis.orient = function() {
      if (!arguments.length) return _orient;
      return axis;
    };

    return d3.rebind(axis, _super,
      "scale", "ticks", "tickArguments", "tickValues", "tickFormat",
      "tickSize", "tickSizeInner", "tickSizeOuter", "tickPadding"
    );


    function meow() {
      if (!axis.labelerOptions().isDevMode) return;
      console.log(...arguments);
    }

  })(d3["axis" + utils.capitalize(_orient)]());

}
