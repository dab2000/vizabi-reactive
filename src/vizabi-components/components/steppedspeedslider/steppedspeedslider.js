import Component from "base/component";
import { throttle, transform } from "base/utils";
import { reaction } from "mobx";

const SteppedSlider = Component.extend({

  init(config, context) {
    this.name = "steppedSpeedSlider";
    this.template = require("raw-loader!./steppedspeedslider.html");

    this.config = Object.assign({
      triangleWidth: 10,
      triangleHeight: 10,
      height: 31,
      lineWidth: 10,
      domain: [1, 2, 3, 4, 5, 6],
      range: [1200, 900, 450, 200, 150, 100]
    }, config);

    this.config.height -= this.config.triangleHeight / 2;

    this.model_expects = [
      {
        name: "time",
        type: "time"
      },
      {
        name: "locale",
        type: "locale"
      }
    ];

    // this.model_binds = {
    //   "change:time.speed": () => {
    //     this.redraw();
    //   }
    // };

    this.setSpeed = throttle(this.setSpeed, 50);

    this._super(config, context);

    reaction(() => this.model.time.speed,
      speed => {
        this.redraw();
      });
  },

  readyOnce() {
    const {
      domain,
      range,
      height
    } = this.config;

    this.element = d3.select(this.element);
    this.svg = this.element.select("svg");

    this.axisScale = d3.scaleLog()
      .domain(d3.extent(domain))
      .range([height, 0]);

    this.speedScale = d3.scaleLinear()
      .domain(domain)
      .range(range);

    this.initTriangle();
    this.initAxis();

    this.redraw();
  },

  initAxis() {
    const {
      lineWidth,
      triangleWidth,
      triangleHeight,
      height
    } = this.config;

    const axis = d3.axisLeft()
      .scale(this.axisScale)
      .tickFormat(() => "")
      .tickSizeInner(lineWidth)
      .tickSizeOuter(0);

    const tx = triangleWidth + lineWidth / 2;
    const ty = triangleHeight / 2;
    this.svg
      .on("mousedown", () => {
        const { offsetY } = d3.event;
        const y = Math.max(0, Math.min(offsetY - ty, height));

        this.setSpeed(Math.round(this.speedScale(this.axisScale.invert(y))), true, true);
      })
      .select(".vzb-stepped-speed-slider-axis")
      .attr("transform", `translate(${tx}, ${ty})`)
      .call(axis);

    this.drag = d3.drag()
      .on("drag", () => {
        const { dy } = d3.event;
        const { translateY } = transform(this.slide.node());
        const y = Math.max(0, Math.min(dy + translateY, height));

        this.setSpeed(Math.round(this.speedScale(this.axisScale.invert(y))));
        this.redraw(y);
      })
      .on("end", () => {
        this.setSpeed(this.model.time.speed, true, true);
      });

    this.svg.call(this.drag);
  },

  initTriangle() {
    const {
      triangleWidth,
      triangleHeight,
      lineWidth
    } = this.config;

    this.slide = this.svg.select(".vzb-stepped-speed-slider-triangle");

    this.slide
      .append("g")
      .append("path")
      .attr("d", this.getTrianglePath());
  },

  getTrianglePath() {
    const {
      triangleHeight,
      triangleWidth
    } = this.config;

    return `M ${triangleWidth},${triangleHeight / 2} 0,${triangleHeight} 0,0 z`;
  },

  setSpeed(value) {
    this.model.time.setSpeed(value);
  },

  redraw(y = this.axisScale(this.speedScale.invert(this.model.time.speed))) {
    this.slide.attr("transform", `translate(0, ${y})`);
  }

});

export default SteppedSlider;
