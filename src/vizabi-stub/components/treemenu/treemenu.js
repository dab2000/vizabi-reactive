import * as utils from "../../base/utils";
import Component from "../../base/component";
import Class from "../../base/class";
//import Marker from "models/marker";
import { close as iconClose } from "../../base/iconset";
import { autorun, reaction } from "mobx";

/*!
 * VIZABI INDICATOR PICKER
 * Reusable indicator picker component
 */

const INDICATOR = "which";
const SCALETYPE = "scaleType";
const MODELTYPE_COLOR = "color";
const MENU_HORIZONTAL = 1;
const MENU_VERTICAL = 2;

//css custom classes
const css = {
  wrapper: "vzb-treemenu-wrap",
  wrapper_outer: "vzb-treemenu-wrap-outer",
  background: "vzb-treemenu-background",
  close: "vzb-treemenu-close",
  search: "vzb-treemenu-search",
  list: "vzb-treemenu-list",
  list_outer: "vzb-treemenu-list-outer",
  list_item: "vzb-treemenu-list-item",
  list_item_leaf: "vzb-treemenu-list-item-leaf",
  leaf: "vzb-treemenu-leaf",
  leaf_content: "vzb-treemenu-leaf-content",
  leaf_content_item: "vzb-treemenu-leaf-content-item",
  leaf_content_item_title: "vzb-treemenu-leaf-content-item-title",
  leaf_content_item_descr: "vzb-treemenu-leaf-content-item-descr",
  hasChild: "vzb-treemenu-list-item-children",
  list_item_label: "vzb-treemenu-list-item-label",
  list_top_level: "vzb-treemenu-list-top",
  search_wrap: "vzb-treemenu-search-wrap",
  isSpecial: "vzb-treemenu-list-item-special",
  hidden: "vzb-hidden",
  title: "vzb-treemenu-title",
  scaletypes: "vzb-treemenu-scaletypes",
  scaletypesDisabled: "vzb-treemenu-scaletypes-disabled",
  scaletypesActive: "vzb-treemenu-scaletypes-active",
  alignYt: "vzb-align-y-top",
  alignYb: "vzb-align-y-bottom",
  alignXl: "vzb-align-x-left",
  alignXr: "vzb-align-x-right",
  alignXc: "vzb-align-x-center",
  menuHorizontal: "vzb-treemenu-horizontal",
  menuVertical: "vzb-treemenu-vertical",
  absPosVert: "vzb-treemenu-abs-pos-vert",
  absPosHoriz: "vzb-treemenu-abs-pos-horiz",
  menuOpenLeftSide: "vzb-treemenu-open-left-side",
  noTransition: "notransition"
};

//options and globals
const OPTIONS = {
  MOUSE_LOCS: [], //contains last locations of mouse
  MOUSE_LOCS_TRACKED: 3, //max number of locations of mouse
  DELAY: 200, //amazons multilevel delay
  TOLERANCE: 150, //this parameter is used for controlling the angle of multilevel dropdown
  LAST_DELAY_LOC: null, //this is cached location of mouse, when was a delay
  TIMEOUT: null, //timeout id
  SEARCH_PROPERTY: "id", //property in input data we we'll search by
  SUBMENUS: "children", //property for submenus (used by search)
  SEARCH_MIN_STR: 1, //minimal length of query string to start searching
  RESIZE_TIMEOUT: null, //container resize timeout
  MOBILE_BREAKPOINT: 400, //mobile breakpoint
  CURRENT_PATH: [], //current active path
  MIN_COL_WIDTH: 60, //minimal column size
  MENU_DIRECTION: MENU_HORIZONTAL,
  MAX_MENU_WIDTH: 320,
  MENU_OPEN_LEFTSIDE: false
};

const Menu = Class.extend({
  init(parent, menu, options) {
    const _this = this;
    this.parent = parent;
    this.entity = menu;
    this.OPTIONS = options;
    this.width = this.OPTIONS.MIN_COL_WIDTH;
    this.direction = this.OPTIONS.MENU_DIRECTION;
    this._setDirectionClass();
    this.menuItems = [];
    let menuItemsHolder;

    if (this.entity.empty()) return this;

    this.entity.each(function() {
      menuItemsHolder = d3.selectAll(this.childNodes).filter(function() {
        return d3.select(this).classed(css.list);
      });
    });
    if (menuItemsHolder.empty()) menuItemsHolder = this.entity;
    menu.selectAll("." + css.list_item)
      .filter(function() {
        return this.parentNode == menuItemsHolder.node();
      })
      .each(function() {
        _this.addSubmenu(d3.select(this));
      });
    if (!this.menuItems.length && this.isActive()) {
      this.buildLeaf();
    }
    return this;
  },
  setWidth(width, recursive, immediate) {
    if (this.width != width && this.entity.node()) {
      this.width = width;
      if ((this.entity.classed(css.list_top_level) || this.entity.classed("active")) && this.direction == MENU_HORIZONTAL) {
        if (!immediate) {
          this.entity.transition()
            .delay(0)
            .duration(100)
            .style("width", this.width + "px");
        } else {
          this.entity.style("width", this.width + "px");
        }
      }
      if (this.entity.classed(css.list_top_level)) {
        this.entity.selectAll("." + css.leaf).style("width", this.width - 1 + "px");
      }
      if (recursive) {
        for (let i = 0; i < this.menuItems.length; i++) {
          this.menuItems[i].setWidth(this.width, recursive, immediate);
        }
      }
      return this;
    }
  },
  /**
   * configure menu type (horizontal or vertical)
   * @param direction MENU_HORIZONTAL or MENU_VERTICAL
   * @param recursive change direction over menu sublevels
   * @returns {Menu}
   */
  setDirection(direction, recursive) {
    this.direction = direction;
    this.entity
      .style("width", "")
      .style("height", "");
    if (recursive) {
      for (let i = 0; i < this.menuItems.length; i++) {
        this.menuItems[i].setDirection(this.direction, recursive);
      }
    }
    this._setDirectionClass();
    return this;
  },
  _setDirectionClass() {
    if (this.direction == MENU_HORIZONTAL) {
      this.entity.classed(css.menuVertical, false);
      this.entity.classed(css.menuHorizontal, true);
    } else {
      this.entity.classed(css.menuHorizontal, false);
      this.entity.classed(css.menuVertical, true);
    }
  },
  addSubmenu(item) {
    this.menuItems.push(new MenuItem(this, item, this.OPTIONS));
  },
  open() {
    const _this = this;
    if (!this.isActive()) {
      _this.parent.parentMenu.openSubmenuNow = true;
      this.closeNeighbors(() => {
        if (_this.direction == MENU_HORIZONTAL) {
          if (!this.menuItems.length) _this.buildLeaf();
          _this._openHorizontal();
          _this.calculateMissingWidth(0);
        } else {
          _this._openVertical();
        }
      });
      _this.parent.parentMenu.openSubmenuNow = false;
    }
    return this;
  },
  /**
   * recursively calculate missed width for last menu level
   * @param width
   * @param cb
   */
  calculateMissingWidth(width, cb) {
    const _this = this;
    if (this.entity.classed(css.list_top_level)) {
      if (width > this.OPTIONS.MAX_MENU_WIDTH) {
        if (typeof cb === "function") cb(width - this.OPTIONS.MAX_MENU_WIDTH);
      }
    } else {
      this.parent.parentMenu.calculateMissingWidth(width + this.width, widthToReduce => {
        if (widthToReduce > 0) {
          _this.reduceWidth(widthToReduce, newWidth => {
            if (typeof cb === "function") cb(newWidth); // callback is not defined if it is emitted from this level
          });
        } else if (typeof cb === "function") cb(widthToReduce);
      });
    }
  },
  /**
   * restore width (if it was reduced before)
   * @param width
   * @param isClosedElement (parameter for check if curent element emit this action)
   * @param cb
   */
  restoreWidth(width, isClosedElement, cb) {
    const _this = this;
    if (isClosedElement) {
      this.parent.parentMenu.restoreWidth(width, false, cb);
    } else if (width <= 0) {
      if (typeof cb === "function") cb();
    } else if (!this.entity.classed(css.list_top_level)) {
      const currentElementWidth =  this.entity.node().offsetWidth;
      const newElementWidth = Math.min(width, _this.width);
      if (currentElementWidth < newElementWidth) {
        const duration = 250 * (currentElementWidth / newElementWidth);
        this.entity.transition()
          .delay(0)
          .duration(duration)
          .style("width", newElementWidth + "px")
          .on("end", () => {
          });
        _this.parent.parentMenu.restoreWidth(width - newElementWidth, false, cb);
      } else {
        this.parent.parentMenu.restoreWidth(width, false, cb);
      }
    } else {
      if (typeof cb === "function") cb();
    }
  },
  /**
   * made element narrower to free space for other element
   * @param width
   * @param cb
   */
  reduceWidth(width, cb) {
    const _this = this;
    const currWidth = this.entity.node().offsetWidth;

    if (currWidth <= this.OPTIONS.MIN_COL_WIDTH) {
      cb(width - _this.width + currWidth);
    } else {

      const newElementWidth = Math.max(this.OPTIONS.MIN_COL_WIDTH, _this.width - width);
      const duration = 250 / (_this.width / newElementWidth);
      this.entity.transition()
        .delay(0)
        .duration(duration)
        .style("width", newElementWidth + "px")
        .on("end", () => {
          cb(width - _this.width + newElementWidth);
        });
    }
  },
  _openHorizontal() {
    const _this = this;
    _this.entity.classed("active", true)
      .transition()
      .delay(0)
      .duration(250)
      .style("width", _this.width + "px")
      .on("end", () => {
        _this.marqueeToggle(true);
      });
  },
  _openVertical() {
    const _this = this;
    _this.entity.style("height", "0px");
    _this.entity.transition()
      .delay(0)
      .duration(250)
      .style("height", (36 * _this.menuItems.length) + "px")
      .on("end", () => {
        _this.entity.style("height", "auto");
        _this.marqueeToggle(true);
        _this.scrollToFitView();
      });
    _this.entity.classed("active", true);
  },
  closeAllChildren(cb) {
    let callbacks = 0;
    for (let i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].isActive()) {
        ++callbacks;
        this.menuItems[i].submenu.close(() => {
          if (--callbacks == 0) {
            if (typeof cb === "function") cb();
          }
        });
      }
    }
    if (callbacks == 0) {
      if (typeof cb === "function") cb();
    }
  },
  closeNeighbors(cb) {
    if (this.parent) {
      this.parent.closeNeighbors(cb);
    } else {
      cb();
    }
  },
  close(cb) {
    const _this = this;
    this.closeAllChildren(() => {
      if (_this.direction == MENU_HORIZONTAL) {
        _this._closeHorizontal(cb);
      } else {
        _this._closeVertical(cb);
      }
    });
  },
  _closeHorizontal(cb) {
    const elementWidth = this.entity.node().offsetWidth;
    const _this = this;
    const openSubmenuNow = _this.parent.parentMenu.openSubmenuNow;
    _this.entity.transition()
      .delay(0)
      .duration(20)
      .style("width", 0 + "px")
      .on("end", () => {
        _this.marqueeToggle(false);
        _this.entity.classed("active", false);
        if (!openSubmenuNow) {
          _this.restoreWidth(_this.OPTIONS.MAX_MENU_WIDTH, true, () => {
            if (typeof cb === "function") cb();
          });
        } else {
          if (typeof cb === "function") cb();
        }
      });
  },
  _closeVertical(cb) {
    const _this = this;
    _this.entity
      .transition()
      .delay(0)
      .duration(100)
      .style("height", 0 + "px")
      .on("end", () => {
        _this.marqueeToggle(false);
        _this.entity.classed("active", false);
        if (typeof cb === "function") cb();
      });
  },
  isActive() {
    return this.entity.classed("active");
  },
  hasActiveParentNeighbour() {
    return this.menuItems
      .filter(item => item.isActive())
      .some(item => !!d3.select(item.entity).node().classed(css.hasChild));
  },
  marqueeToggle(toggle) {
    for (let i = 0; i < this.menuItems.length; i++) {
      this.menuItems[i].marqueeToggle(toggle);
    }
  },
  marqueeToggleAll(toggle) {
    for (let i = 0; i < this.menuItems.length; i++) {
      this.menuItems[i].marqueeToggleAll(toggle);
    }
  },
  findItemById(id) {
    for (let i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].entity.data().id == id) {
        return this.menuItems[i];
      }
      if (this.menuItems[i].submenu) {
        const item = this.menuItems[i].submenu.findItemById(id);
        if (item) return item;
      }
    }
    return null;
  },
  getTopMenu() {
    return this.parent ?
      this.parent.parentMenu.getTopMenu() :
      this;
  },

  scrollToFitView() {
    const treeMenuNode = this.getTopMenu().entity.node().parentNode;
    const parentItemNode = this.entity.node().parentNode;
    const menuRect = treeMenuNode.getBoundingClientRect();
    const itemRect = parentItemNode.getBoundingClientRect();
    const viewportItemTop = itemRect.top - menuRect.top;
    if (viewportItemTop + itemRect.height > menuRect.height) {
      const newItemTop = (itemRect.height > menuRect.height) ?
        (menuRect.height - 10) : (itemRect.height + 10);

      const newScrollTop = treeMenuNode.scrollTop + newItemTop - menuRect.height + viewportItemTop;

      const scrollTopTween = function(scrollTop) {
        return function() {
          const i = d3.interpolateNumber(this.scrollTop, scrollTop);
          return function(t) {
            treeMenuNode.scrollTop = i(t);
          };
        };
      };

      d3.select(treeMenuNode).transition().duration(100)
        .tween("scrolltoptween", scrollTopTween(newScrollTop));

    }

  },

  buildLeaf() {
    const leafDatum = this.entity.datum();

    this.entity.selectAll("div").data([leafDatum]).enter()
      .append("div").classed(css.leaf + " " + css.leaf_content + " vzb-dialog-scrollable", true)
      .style("width", this.width + "px")
      .each(function(d) {
        const leafContent = d3.select(this);
        leafContent.append("span").classed(css.leaf_content_item + " " + css.leaf_content_item_title, true)
          .text(utils.replaceNumberSpacesToNonBreak(d.name) || "");
        leafContent.append("span").classed(css.leaf_content_item + " " + css.leaf_content_item_descr, true)
          .text(utils.replaceNumberSpacesToNonBreak(d.description) || "");
      });
  }
});

const MenuItem = Class.extend({
  init(parent, item, options) {
    const _this = this;
    this.parentMenu = parent;
    this.entity = item;
    const submenu = item.select("." + css.list_outer);
    if (submenu.node()) {
      this.submenu = new Menu(this, submenu, options);
    }
    this.entity.select("." + css.list_item_label).on("mouseenter", function() {
      if (utils.isTouchDevice()) return;

      if (_this.parentMenu.direction == MENU_HORIZONTAL && !d3.select(this).attr("children")) {
        _this.openSubmenu();
      } else if (!_this.parentMenu.hasActiveParentNeighbour()) {
        _this.closeNeighbors();
      }
      _this.marqueeToggle(true);
    }).on("click.item", function() {
      if (utils.isTouchDevice()) return;
      d3.event.stopPropagation();
      if (_this.parentMenu.direction == MENU_HORIZONTAL) {
        _this.openSubmenu();
      } else {
        const view = d3.select(this);
        //only for leaf nodes
        if (!view.attr("children")) return;
        _this.toggleSubmenu();
      }
    }).onTap(evt => {
      d3.event.stopPropagation();
      if (_this.parentMenu.direction == MENU_VERTICAL) {
        const view = _this.entity.select("." + css.list_item_label);
        //only for leaf nodes
        if (!view.attr("children")) return;
      }
      _this.toggleSubmenu();
    });
    return this;
  },
  setWidth(width, recursive, immediate) {
    if (this.submenu && recursive) {
      this.submenu.setWidth(width, recursive, immediate);
    }
    return this;
  },
  setDirection(direction, recursive) {
    if (this.submenu && recursive) {
      this.submenu.setDirection(direction, recursive);
    }
    return this;
  },
  toggleSubmenu() {
    if (this.submenu) {
      if (this.submenu.isActive()) {
        this.submenu.close();
      } else {
        this.submenu.open();
      }
    }
  },
  openSubmenu() {
    if (this.submenu) {
      this.submenu.open();
    } else {
      this.closeNeighbors();
    }
  },
  closeNeighbors(cb) {
    this.parentMenu.closeAllChildren(cb);
  },
  isActive() {
    return this.submenu && this.submenu.isActive();
  },
  marqueeToggleAll(toggle) {
    const _this = this;
    const labels = this.entity.selectAll("." + css.list_item_label);
    labels.each(function() {
      const label = d3.select(this).select("span");
      const parent = d3.select(this.parentNode);
      parent.classed("marquee", false);
      label.style("width", "");
      if (toggle) {
        if (label.node().scrollWidth > label.node().offsetWidth) {
          label.attr("data-content", label.text());
          const space = 30;
          const offset = space + label.node().scrollWidth;
          label.style("width", offset + "px");
          parent.classed("marquee", true);
        }
      }
    });
  },
  marqueeToggle(toggle) {
    const label = this.entity.select("." + css.list_item_label).select("span");
    this.entity.classed("marquee", false);
    label.style("width", "");
    if (toggle) {
      if (label.node().scrollWidth > label.node().offsetWidth) {
        label.attr("data-content", label.text());
        const space = 30;
        const offset = space + label.node().scrollWidth;
        label.style("width", offset + "px");
        this.entity.classed("marquee", true);
      }
    }
  }
});

const TreeMenu = Component.extend({

  //setters-getters
  indicatorsTree(input) {
    if (!arguments.length) return this._indicatorsTree;
    this._indicatorsTree = input;
    return this;
  },
  callback(input) {
    if (!arguments.length) return this._callback;
    this._callback = input;
    return this;
  },
  markerID(input) {
    if (!arguments.length) return this._markerID;
    this._markerID = input;
    this.targetModel(this.model.marker.encoding.get(this._markerID));
    return this;
  },
  showWhenReady(input) {
    if (!arguments.length) return this._showWhenReady;
    this._showWhenReady = input;
    return this;
  },
  scaletypeSelectorDisabled(input) {
    if (!arguments.length) return this._scaletypeSelectorDisabled;
    this._scaletypeSelectorDisabled = input;
    return this;
  },
  title(input) {
    if (!arguments.length) return this._title;
    this._title = input;
    return this;
  },
  targetModel(input) {
    if (!arguments.length) return this._targetModel;
    if (this._targetModel) {
      this._targetModelDisposer();
      //this._targetModel.off("change", this.change);
    }
    this._targetModel = input;
    //this._targetModel.on("change", this.change);
    //if (this._targetModel.isHook()) {
    if (this._targetModel.marker) {
        this._targetProp = "which";
    } else {
    //if (this._targetModel instanceof Marker) {
      this._targetProp = "space";
    }
    this._targetModelDisposer = reaction(() => {
      if (this._targetModel.marker) {
        const concept = this._targetModel.data.concept;
        const scaleType = this._targetModel.scale.type;
      }
      const space = this._targetModel.data.space;
    }, this.updateView);
    return this;
  },
  targetProp(input) {
    if (!arguments.length) return this._targetProp;
    this._targetProp = input;
    return this;
  },
  alignX(input) {
    if (!arguments.length) return this._alignX;
    this._alignX = input;
    return this;
  },
  alignY(input) {
    if (!arguments.length) return this._alignY;
    this._alignY = input;
    return this;
  },
  top(input) {
    if (!arguments.length) return this._top;
    this._top = input;
    return this;
  },
  left(input) {
    if (!arguments.length) return this._left;
    this._left = input;
    return this;
  },

  init(config, context) {

    const _this = this;

    this.name = "gapminder-treemenu";
    this.model_expects = [{
      name: "marker",
      type: "marker"
    }, {
      name: "time",
      type: "time"
    }, {
      name: "locale",
      type: "locale"
    }, {
      name: "ui",
      type: "ui"
    }, {
      name: "dataSources",
      type: "store"
    }];

    this.context = context;
    // object for manipulation with menu representation level
    this.menuEntity = null;

    //contructor is the same as any component
    this._super(config, context);

    //default callback
    this._callback = function(indicator) {
      console.log("Indicator selector: stub callback fired. New indicator is ", indicator);
    };
    this._alignX = "center";
    this._alignY = "center";

    //options
    this.OPTIONS = utils.deepClone(OPTIONS);

    this.change = this.change.bind(this);
  },

  change(evt, path) {
    //if (path.indexOf("." + this._targetProp) == -1 && (!this._targetModel.isHook() || path.indexOf(".scaleType") == -1)) return;
    const scaleType = 
    this.updateView();
  },

  ready() {
    const tags = this.model.dataSources.getTags()
      .then(this._buildIndicatorsTree.bind(this))
      .then(this.updateView.bind(this));
  },

  readyOnce() {
    //this function is only called once at start, when both DOM and this.model are ready
    //this.element contains the view where you can append the menu
    this.element = d3.select(this.placeholder);
    //menu class private
    const _this = this;

    this.element.selectAll("div").remove();

    //general markup

    this.element.append("div")
      .attr("class", css.background)
      .on("click", () => {
        d3.event.stopPropagation();
        _this.toggle();
      });

    this.wrapperOuter = this.element
      .append("div")
      .classed(css.wrapper_outer, true)
      .classed(css.noTransition, true);

    this.wrapper = this.wrapperOuter
      .append("div")
      .classed(css.wrapper, true)
      .classed(css.noTransition, true)
      .classed("vzb-dialog-scrollable", true);

    this.wrapper
      .on("click", () => {
        d3.event.stopPropagation();
      });

    this.wrapper.append("div")
      .attr("class", css.close)
      .html(iconClose)
      .on("click", () => {
        d3.event.stopPropagation();
        _this.toggle();
      })
      .select("svg")
      .attr("width", "0px")
      .attr("height", "0px")
      .attr("class", css.close + "-icon");

    this.wrapper.append("div")
      .classed(css.scaletypes, true)
      .append("span");
    this.wrapper.append("div")
      .classed(css.title, true)
      .append("span");

    this.wrapper.append("div")
      .classed(css.search_wrap, true)
      .append("input")
      .classed(css.search, true)
      .attr("type", "search")
      .attr("id", css.search);


    //init functions
    d3.select("body").on("mousemove", _this._mousemoveDocument);
    this.wrapper.on("mouseleave", () => {
      //if(_this.menuEntity.direction != MENU_VERTICAL) _this.menuEntity.closeAllChildren();
    });

    this.translator = t=>t;//this.model.locale.getTFunction();

    _this._enableSearch();

    _this.resize();
  },


  _buildIndicatorsTree(tagsArray) {
    if (tagsArray === true || !tagsArray) tagsArray = [];

    const _this = this;

    const S_DSNAME = Symbol.for("dataSourceName");

    const ROOT = "_root";
    const DEFAULT = "_default";
    const ADVANCED = "advanced";
    const OTHER_DATASETS = "other_datasets";

    const FOLDER_STRATEGY_SPREAD = "spread"; //spread indicatos over the root of treemeny
    const FOLDER_STRATEGY_ROOT = "root"; //put indicators in dataset's own folder under root of treemeny
    const FOLDER_STRATEGY_FOLDER = "folder"; //put indicators in dataset's own folder inside a specified folder. use notation like "folder:other_datasets"

    const dataModels = this.model.dataSources.named;
    ////_this.model.marker._root.dataManager.getDataModels();
    const FOLDER_STRATEGY_DEFAULT = dataModels.size == 1 ? FOLDER_STRATEGY_SPREAD : FOLDER_STRATEGY_ROOT;

    //init the dictionary of tags and add default folders
    const tags = {};
    tags[ROOT] = { id: ROOT, children: [] };
    tags[ADVANCED] = { id: ADVANCED, name: this.translator("treemenu/advanced"), type: "folder", children: [] };
    tags[ROOT].children.push(tags[ADVANCED]);
    tags[OTHER_DATASETS] = { id: OTHER_DATASETS, name: this.translator("treemenu/other_datasets"), type: "folder", children: [] };
    tags[ROOT].children.push(tags[OTHER_DATASETS]);

    //populate the dictionary of tags
    tagsArray.forEach(tag => { tags[tag.tag] = { id: tag.tag, name: tag.name, type: "folder", children: [] }; });

    //put the dataset folders where they should be: either in root or in specific folders or ==root in case of spreading
    const folderStrategies = {};
    dataModels.forEach((m, mName) => {

      //figure out the folder strategy
      let strategy = utils.getProp(this.model.ui, ["treemenu", "folderStrategyByDataset", mName]);
      let folder = null;
      if (!strategy) strategy = FOLDER_STRATEGY_DEFAULT;

      if (strategy.includes(":")) {
        folder = strategy.split(":")[1];
        strategy = strategy.split(":")[0];
      }

      //add the dataset's folder to the tree
      tags[mName] = { id: mName, name: m.getDatasetName() || mName, type: "dataset", children: [] };

      if (strategy == FOLDER_STRATEGY_FOLDER && tags[folder]) {
        tags[folder].children.push(tags[mName]);
      } else if (strategy == FOLDER_STRATEGY_SPREAD) {
        tags[mName] = tags[ROOT];
      } else {
        tags[ROOT].children.push(tags[mName]);
      }

      folderStrategies[mName] = strategy;
    });

    //init the tag tree
    const indicatorsTree = tags[ROOT];

    //populate the tag tree
    tagsArray.forEach(tag => {

      //if tag's parent is defined
      if (tag.parent && tags[tag.parent]) {

        //add tag to a branch
        tags[tag.parent].children.push(tags[tag.tag]);

      } else {

        //if parent is missing add a tag either to dataset's own folder or to the root if spreading them
        if (folderStrategies[tag[S_DSNAME]] == FOLDER_STRATEGY_SPREAD) {
          tags[ROOT].children.push(tags[tag.tag]);
        } else {
          tags[tag[S_DSNAME]].children.push(tags[tag.tag]);
        }
      }
    });


    const properties = this.model.marker.data.space.length > 1;
    this.model.marker.availability.forEach(kvPair => {
      const entry = kvPair.value;
      const sourceName = this.model.dataSources.getId(kvPair.source);
      //if entry's tag are empty don't include it in the menu
      if (!entry || entry.tags == "_none") return;
      if (!entry.tags) entry.tags = sourceName || ROOT;

      const use = entry.concept == "_default" ? "constant" : (kvPair.key.length > 1 || entry.concept_type === "time" ? "indicator" : "property");
      const concept = { id: entry.concept, key: kvPair.key, name: entry.name, name_catalog: entry.name_catalog, description: entry.description, dataSource: sourceName, use };

      if (properties && kvPair.key.length == 1 && entry.concept != "_default" && entry.concept_type != "time") {

        const folderName = kvPair.key[0].concept + "_properties";
        if (!tags[folderName]) {
          const dim = kvPair.key[0];
          tags[folderName] = { id: folderName, name: dim.name + " properties", type: "folder", children: [] };
          tags[ROOT].children.push(tags[folderName]);
        }
        tags[folderName].children.push(concept);

      } else {

        entry.tags.split(",").forEach(tag => {
          tag = tag.trim();
          if (tags[tag]) {
            tags[tag === "_root" && entry.concept != "_default" && entry.concept_type != "time" ? concept.dataSource : tag].children.push(concept);
          } else {
            //if entry's tag is not found in the tag dictionary
            if (!_this.consoleGroupOpen) {
              console.groupCollapsed("Some tags were not found, so indicators went under menu root");
              _this.consoleGroupOpen = true;
            }
            utils.warn("tag '" + tag + "' for indicator '" + concept.id + "'");
            tags[ROOT].children.push(concept);
          }
        });

      }
    });

    /**
     * KEY-AVAILABILITY (dimensions for space-menu)
     */
    this.model.marker.spaceAvailability.forEach((space, str) => {
      indicatorsTree.children.push({
        id: str,
        name: space.map(dim => dim.name).join(", "),
        name_catalog: space.map(dim => dim.name).join(", "),
        description: "no description",
        dataSource: "All data sources",
        type: "space"
      });
    });

    if (_this.consoleGroupOpen) {
      console.groupEnd();
      delete _this.consoleGroupOpen;
    }
    this._sortChildren(indicatorsTree);
    this.indicatorsTree(indicatorsTree);

    return Promise.resolve();
  },

  _sortChildren(tree, isSubfolder) {
    const _this = this;
    if (!tree.children) return;
    tree.children.sort(
      utils
      //in each folder including root: put subfolders below loose items
        .firstBy()((a, b) => { a = a.type === "dataset" ? 1 : 0;  b = b.type === "dataset" ? 1 : 0; return b - a; })
        .thenBy((a, b) => { a = a.children ? 1 : 0;  b = b.children ? 1 : 0; return a - b; })
        .thenBy((a, b) => {
        //in the root level put "time" on top and send "anvanced" to the bottom
          if (!isSubfolder) {
            if (a.id == "time") return -1;
            if (b.id == "time") return 1;
            if (a.id == "other_datasets") return 1;
            if (b.id == "other_datasets") return -1;
            if (a.id == "advanced") return 1;
            if (b.id == "advanced") return -1;
            if (a.id == "_default") return 1;
            if (b.id == "_default") return -1;
          }
          //sort items alphabetically. folders go down because of the emoji folder in the beginning of the name
          return (a.name_catalog || a.name) > (b.name_catalog || b.name) ? 1 : -1;
        })
    );

    //recursively sort items in subfolders too
    tree.children.forEach(d => {
      _this._sortChildren(d, true);
    });
  },

  //happens on resizing of the container
  resize() {
    const _this = this;

    this.profiles = {
      "small": {
        col_width: 200
      },
      "medium": {
        col_width: 200
      },
      "large": {
        col_width: 200
      }
    };

    let top = this._top;
    let left = this._left;

    if (!this.wrapper) return utils.warn("treemenu resize() abort because container is undefined");

    this.wrapper.classed(css.noTransition, true);
    this.wrapper.node().scrollTop = 0;

    this.activeProfile = this.profiles[this.getLayoutProfile()];
    this.OPTIONS.IS_MOBILE = this.getLayoutProfile() === "small";

    if (this.menuEntity) {
      this.menuEntity.setWidth(this.activeProfile.col_width, true, true);

      if (this.OPTIONS.IS_MOBILE) {
        if (this.menuEntity.direction != MENU_VERTICAL) {
          this.menuEntity.setDirection(MENU_VERTICAL, true);
          this.OPTIONS.MENU_DIRECTION = MENU_VERTICAL;
        }
      } else {
        if (this.menuEntity.direction != MENU_HORIZONTAL) {
          this.menuEntity.setDirection(MENU_HORIZONTAL, true);
          this.OPTIONS.MENU_DIRECTION = MENU_HORIZONTAL;
        }
      }
    }

    this.width = _this.element.node().offsetWidth;
    this.height = _this.element.node().offsetHeight;
    const rect = this.wrapperOuter.node().getBoundingClientRect();
    const containerWidth = rect.width;
    let containerHeight = rect.height;
    if (containerWidth) {
      if (this.OPTIONS.IS_MOBILE) {
        this.clearPos();
      } else {
        if (top || left) {
          if (this.wrapperOuter.node().offsetTop < 10) {
            this.wrapperOuter.style("top", "10px");
          }
          if (this.height - _this.wrapperOuter.node().offsetTop - containerHeight < 0) {
            if (containerHeight > this.height) {
              containerHeight = this.height - 20;
            }
            this.wrapperOuter.style("top", (this.height - containerHeight - 10) + "px");
            this.wrapperOuter.style("bottom", "auto");
          }
          if (top) top = _this.wrapperOuter.node().offsetTop;
        }

        let maxHeight;
        if (this.wrapperOuter.classed(css.alignYb)) {
          maxHeight = this.wrapperOuter.node().offsetTop + this.wrapperOuter.node().offsetHeight;
        } else {
          maxHeight = this.height - this.wrapperOuter.node().offsetTop;
        }
        this.wrapper.style("max-height", (maxHeight - 10) + "px");

        this.wrapperOuter.classed(css.alignXc, this._alignX === "center");
        this.wrapperOuter.style("margin-left", this._alignX === "center" ? "-" + containerWidth / 2 + "px" : null);
        if (this._alignX === "center") {
          this.OPTIONS.MAX_MENU_WIDTH = this.width / 2 - containerWidth * 0.5 - 10;
        } else {
          this.OPTIONS.MAX_MENU_WIDTH = this.width - this.wrapperOuter.node().offsetLeft - containerWidth - 10; // 10 - padding around wrapper
        }

        const minMenuWidth = this.activeProfile.col_width + this.OPTIONS.MIN_COL_WIDTH * 2;
        let leftPos = this.wrapperOuter.node().offsetLeft;
        this.OPTIONS.MENU_OPEN_LEFTSIDE = this.OPTIONS.MAX_MENU_WIDTH < minMenuWidth && leftPos > (this.OPTIONS.MAX_MENU_WIDTH + 10);
        if (this.OPTIONS.MENU_OPEN_LEFTSIDE) {
          if (leftPos <  (minMenuWidth + 10)) leftPos = (minMenuWidth + 10);
          this.OPTIONS.MAX_MENU_WIDTH = leftPos - 10; // 10 - padding around wrapper
        } else {
          if (this.OPTIONS.MAX_MENU_WIDTH < minMenuWidth) {
            leftPos -= (minMenuWidth - this.OPTIONS.MAX_MENU_WIDTH);
            this.OPTIONS.MAX_MENU_WIDTH = minMenuWidth;
          }
        }

        if (left) {
          left = leftPos;
        } else {
          if (leftPos != this.wrapperOuter.node().offsetLeft) {
            this.wrapperOuter.style("left", "auto");
            this.wrapperOuter.style("right", (this.width - leftPos - rect.width) + "px");
          }
        }

        this._top = top;
        this._left = left;

        if (left || top) this.setPos();

        this.wrapperOuter.classed("vzb-treemenu-open-left-side", !this.OPTIONS.IS_MOBILE && this.OPTIONS.MENU_OPEN_LEFTSIDE);
      }
    }

    this.wrapper.node().offsetHeight;
    this.wrapper.classed(css.noTransition, false);

    this.setHorizontalMenuHeight();

    return this;
  },

  toggle() {
    this.setHiddenOrVisible(!this.element.classed(css.hidden));
  },

  setHiddenOrVisible(hidden) {
    const _this = this;

    this.element.classed(css.hidden, hidden);
    this.wrapper.classed(css.noTransition, hidden);

    if (hidden) {
      this.clearPos();
      this.menuEntity.marqueeToggle(false);
    } else {
      this.setPos();
      !utils.isTouchDevice() && this.focusSearch();
      this.resize();
      this.scrollToSelected();
    }

    this.parent.components.forEach(c => {
      if (c.name == "gapminder-dialogs") {
        d3.select(c.placeholder.parentNode).classed("vzb-blur", !hidden);
      } else
      if (c.element.classed) {
        c.element.classed("vzb-blur", c != _this && !hidden);
      } else {
        d3.select(c.element).classed("vzb-blur", c != _this && !hidden);
      }
    });

    this.width = _this.element.node().offsetWidth;
    
    return this;
  },

  scrollToSelected() {
    if (!this.selectedNode) return;
    const _this = this;
    const scrollToItem = function(listNode, itemNode) {
      listNode.scrollTop = 0;
      const rect = listNode.getBoundingClientRect();
      const itemRect = itemNode.getBoundingClientRect();
      const scrollTop = itemRect.bottom - rect.top - listNode.offsetHeight + 10;
      listNode.scrollTop = scrollTop;
    };

    if (this.menuEntity.direction == MENU_VERTICAL) {
      scrollToItem(this.wrapper.node(), this.selectedNode);
      _this.menuEntity.marqueeToggleAll(true);
    } else {
      const selectedItem = this.menuEntity.findItemById(d3.select(this.selectedNode).data().id);
      selectedItem.submenu.calculateMissingWidth(0, () => {
        _this.menuEntity.marqueeToggleAll(true);
      });

      let parent = this.selectedNode;
      let listNode;
      while (!(utils.hasClass(parent, css.list_top_level))) {
        if (parent.tagName == "LI") {
          listNode = utils.hasClass(parent.parentNode, css.list_top_level) ? parent.parentNode.parentNode : parent.parentNode;
          scrollToItem(listNode, parent);
        }
        parent = parent.parentNode;
      }
    }
  },

  setPos() {
    const top = this._top;
    const left = this._left;
    const rect = this.wrapperOuter.node().getBoundingClientRect();

    if (top) {
      this.wrapperOuter.style("top", top + "px");
      this.wrapperOuter.style("bottom", "auto");
      this.wrapperOuter.classed(css.absPosVert, top);
    }
    if (left) {
      let right = this.element.node().offsetWidth - left - rect.width;
      right = right < 10 ? 10 : right;
      this.wrapperOuter.style("right", right + "px");
      this.wrapperOuter.style("left", "auto");
      this.wrapperOuter.classed(css.absPosHoriz, right);
    }

  },

  clearPos() {
    this._top = "";
    this._left = "";
    this.wrapperOuter.attr("style", "");
    this.wrapperOuter.classed(css.absPosVert, "");
    this.wrapperOuter.classed(css.absPosHoriz, "");
    this.wrapperOuter.classed(css.menuOpenLeftSide, "");
    this.wrapper.style("max-height", "");
  },

  setHorizontalMenuHeight() {
    let wrapperHeight = null;
    if (this.menuEntity && this.OPTIONS.MENU_DIRECTION == MENU_HORIZONTAL && this.menuEntity.menuItems.length) {
      const oneItemHeight = parseInt(this.menuEntity.menuItems[0].entity.style("height"), 10) || 0;
      const menuMaxHeight = oneItemHeight * this._maxChildCount;
      const rootMenuHeight = Math.max(this.menuEntity.menuItems.length, 3) * oneItemHeight + this.menuEntity.entity.node().offsetTop + parseInt(this.wrapper.style("padding-bottom"), 10);
      wrapperHeight = "" + Math.max(menuMaxHeight, rootMenuHeight) + "px";
    }
    this.wrapper.classed(css.noTransition, true);
    this.wrapper.node().offsetHeight;
    this.wrapper.style("height", wrapperHeight);
    this.wrapper.node().offsetHeight;
    this.wrapper.classed(css.noTransition, false);
  },
  //search listener
  _enableSearch() {
    const _this = this;

    const input = this.wrapper.select("." + css.search);

    //it forms the array of possible queries
    const getMatches = function(value) {
      const matches = {
        _id: "root",
        children: []
      };

      //translation integration
      const translationMatch = function(value, data, i) {

        let translate = data[i].name;
        if (!translate && _this.translator) {
          const t1 = _this.translator("indicator" + "/" + data[i][_this.OPTIONS.SEARCH_PROPERTY] + "/" + _this._targetModel._type);
          translate =  t1 || _this.translator("indicator/" + data[i][_this.OPTIONS.SEARCH_PROPERTY]);
        }
        return translate && translate.toLowerCase().indexOf(value.toLowerCase()) >= 0;
      };

      const matching = function(data) {
        const SUBMENUS = _this.OPTIONS.SUBMENUS;
        for (let i = 0; i < data.length; i++) {
          let match = false;
          match =  translationMatch(value, data, i);
          if (match) {
            matches.children.push(data[i]);
          }
          if (!match && data[i][SUBMENUS]) {
            matching(data[i][SUBMENUS]);
          }
        }
      };
      matching(_this.dataFiltered.children);

      matches.children = utils.unique(matches.children, child => child.id);
      return matches;
    };

    let searchValueNonEmpty = false;

    const searchIt = utils.debounce(() => {
      const value = input.node().value;

      //Protection from unwanted IE11 input events.
      //IE11 triggers an 'input' event when 'placeholder' attr is set to input element and
      //on 'focusin' and on 'focusout', if nothing has been entered into the input.
      if (!searchValueNonEmpty && value == "") return;
      searchValueNonEmpty = value != "";

      if (value.length >= _this.OPTIONS.SEARCH_MIN_STR) {
        _this.redraw(getMatches(value), true);
      } else {
        _this.redraw();
      }
    }, 250);

    input.on("input", searchIt);
  },

  _selectIndicator(value) {
    this._callback(this._targetProp, value);
    this.toggle();
  },


  //function is redrawing data and built structure
  redraw(data, useDataFiltered) {
    const _this = this;

    const isHook = !!_this._targetModel.marker; //isHook();

    let dataFiltered, allowedIDs;

    const indicatorsDB = this.model.dataSources.getAll().reduce((result, source) => {
      utils.deepExtend(result, utils.mapToObj(source.concepts));
      return result;
    }, {})
    // // utils.forEach(this.model.marker._root._data, m => {
    // //   if (m._type === "data") utils.deepExtend(indicatorsDB, m.getConceptprops());
    // // });

    const targetModelType = _this._targetModel._type;

    if (useDataFiltered) {
      dataFiltered = data;
    } else {
      if (data == null) data = this._indicatorsTree;

      if (isHook) {
        allowedIDs = utils.keys(indicatorsDB).filter(f => {
          //check if indicator is denied to show with allow->names->!indicator
          if (_this._targetModel.allow && _this._targetModel.allow.names) {
            if (_this._targetModel.allow.names.indexOf("!" + f) != -1) return false;
            if (_this._targetModel.allow.names.indexOf(f) != -1) return true;
            if (_this._targetModel.allow.namesOnlyThese) return false;
          }
          //keep indicator if nothing is specified in tool properties
          if (!_this._targetModel.allow || !_this._targetModel.allow.scales) return true;
          //keep indicator if any scale is allowed in tool properties
          if (_this._targetModel.allow.scales[0] == "*") return true;

          // if no scales defined, all are allowed
          if (!indicatorsDB[f].scales) return true;

          //check if there is an intersection between the allowed tool scale types and the ones of indicator
          for (let i = indicatorsDB[f].scales.length - 1; i >= 0; i--) {
            if (_this._targetModel.allow.scales.indexOf(indicatorsDB[f].scales[i]) > -1) return true;
          }

          return false;
        });
        dataFiltered = utils.pruneTree(data, f => allowedIDs.indexOf(f.id) > -1);
      } else if (_this._targetModel instanceof Marker) {
        allowedIDs = data.children.map(child => child.id);
        dataFiltered = utils.pruneTree(data, f => f.type == "space");
      } else {
        allowedIDs = utils.keys(indicatorsDB);
        dataFiltered = utils.pruneTree(data, f => allowedIDs.indexOf(f.id) > -1);
      }

      this.dataFiltered = dataFiltered;
    }

    this.wrapper.select("ul").remove();

    let title = "";
    if (this._title || this._title === "") {
      title = this._title;
    } else {
      title = this.translator(
        !_this._targetModel.marker ? _this._targetModel._root._name + "/" + _this._targetModel._name
          : "buttons/" + (isHook ? _this._targetModel._name : (targetModelType + "/" + _this._targetProp))
      );
    }
    this.element.select("." + css.title).select("span")
      .text(title);

    this.element.select("." + css.search)
      .attr("placeholder", this.translator("placeholder/search") + "...");

    this._maxChildCount = 0;

    const noDescription = _this.translator("hints/nodescr");

    function createSubmeny(select, data, toplevel) {
      if (!data.children) return;
      _this._maxChildCount = Math.max(_this._maxChildCount, data.children.length);
      const _select = toplevel ? select : select.append("div")
        .classed(css.list_outer, true);

      const li = _select.append("ul")
        .classed(css.list, !toplevel)
        .classed(css.list_top_level, toplevel)
        .classed("vzb-dialog-scrollable", true)
        .selectAll("li")
        .data(data.children, d => d["id"])
        .enter()
        .append("li");

      li.append("span")
        .classed(css.list_item_label, true)
        // .attr("info", function(d) {
        //   return d.id;
        // })
        .attr("children", d => d.children ? "true" : null)
        .attr("type", d => d.type ? d.type : null)
        .on("click", function(d) {
          const view = d3.select(this);
          //only for leaf nodes
          if (view.attr("children")) return;
          d3.event.stopPropagation();
          _this._selectIndicator({ concept: d.id, key: d.key, dataSource: d.dataSource, use: d.use });
        })
        .append("span")
        .text(d => {
          //Let the indicator "_default" in tree menu be translated differnetly for every hook type
          const translated = d.id === "_default" ? _this.translator("indicator/_default/" + targetModelType) : d.name_catalog || d.name || d.id;
          if (!translated && translated !== "") utils.warn("translation missing: NAME of " + d.id);
          return translated || "";
        });

      li.classed(css.list_item, true)
        .classed(css.hasChild, d => d["children"])
        .classed(css.isSpecial, d => d["special"])
        .each(function(d) {
          const view = d3.select(this);

          //deepLeaf
          if (!d.children) {
            if (d.id === "_default") {
              d.name = _this.translator("indicator/_default/" + targetModelType);
              d.description = _this.translator("description/_default/" + targetModelType);
            }
            if (!d.description) d.description = noDescription;
            const deepLeaf = view.append("div").attr("class", css.menuHorizontal + " " + css.list_outer + " " + css.list_item_leaf);
            deepLeaf.on("click", d => {
              _this._selectIndicator({ concept: d.id, key: d.key, dataSource: d.dataSource, use: d.use });
            });
          }

          if (d.id == _this._targetModel[_this._targetProp]) {
            let parent;
            if (_this.selectedNode && toplevel) {
              parent = _this.selectedNode.parentNode;
              d3.select(_this.selectedNode)
                .select("." + css.list_item_leaf).classed("active", false);
              while (!(utils.hasClass(parent, css.list_top_level))) {
                if (parent.tagName == "UL") {
                  d3.select(parent.parentNode)
                    .classed("active", false);
                }
                parent = parent.parentNode;
              }
            }
            if (!_this.selectedNode || toplevel) {
              parent = this.parentNode;
              d3.select(this).classed("item-active", true)
                .select("." + css.list_item_leaf).classed("active", true);
              while (!(utils.hasClass(parent, css.list_top_level))) {
                if (parent.tagName == "UL") {
                  d3.select(parent.parentNode)
                    .classed("active", true);
                }
                if (parent.tagName == "LI") {
                  d3.select(parent).classed("item-active", true);
                }
                parent = parent.parentNode;
              }
              _this.selectedNode = this;
            }
          }
          createSubmeny(view, d);
        });
    }

    if (this.OPTIONS.IS_MOBILE) {
      this.OPTIONS.MENU_DIRECTION = MENU_VERTICAL;
    } else {
      this.OPTIONS.MENU_DIRECTION = MENU_HORIZONTAL;
    }
    this.selectedNode = null;
    createSubmeny(this.wrapper, dataFiltered, true);
    this.menuEntity = new Menu(null, this.wrapper.selectAll("." + css.list_top_level), this.OPTIONS);
    if (this.menuEntity) this.menuEntity.setDirection(this.OPTIONS.MENU_DIRECTION);
    if (this.menuEntity) this.menuEntity.setWidth(this.activeProfile.col_width, true, true);

    this.setHorizontalMenuHeight();

    if (!useDataFiltered) {
      let pointer = "_default";
      if (allowedIDs.indexOf(this._targetModel[_this._targetProp]) > -1) pointer = this._targetModel[_this._targetProp];
      if (!indicatorsDB[pointer]) utils.error("Concept properties of " + pointer + " are missing from the set, or the set is empty. Put a breakpoint here and check what you have in indicatorsDB");

      if (!indicatorsDB[pointer].scales) {
        this.element.select("." + css.scaletypes).classed(css.hidden, true);
        return true;
      }
      const scaleTypesData = isHook ? indicatorsDB[pointer].scales.filter(f => {
        if (!_this._targetModel.allow || !_this._targetModel.allow.scales) return true;
        if (_this._targetModel.allow.scales[0] == "*") return true;
        return _this._targetModel.allow.scales.indexOf(f) > -1;
      }) : [];
      if (scaleTypesData.length == 0) {
        this.element.select("." + css.scaletypes).classed(css.hidden, true);
      } else {

        let scaleTypes = this.element.select("." + css.scaletypes).classed(css.hidden, false).selectAll("span")
          .data(scaleTypesData, d => d);

        scaleTypes.exit().remove();

        scaleTypes = scaleTypes.enter().append("span")
          .on("click", d => {
            d3.event.stopPropagation();
            _this._setModel("scaleType", d);
          })
          .merge(scaleTypes);

        const mdlScaleType = _this._targetModel.scaleType;

        scaleTypes
          .classed(css.scaletypesDisabled, scaleTypesData.length < 2 || _this._scaletypeSelectorDisabled)
          .classed(css.scaletypesActive, d => (d == mdlScaleType || d === "log" && mdlScaleType === "genericLog") && scaleTypesData.length > 1)
          .text(d => _this.translator("scaletype/" + d));
      }

    }

    return this;
  },


  updateView() {
    const _this = this;

    if (!this._targetModel) return;

    this.wrapperOuter.classed(css.absPosVert, this._top);
    this.wrapperOuter.classed(css.alignYt, this._alignY === "top");
    this.wrapperOuter.classed(css.alignYb, this._alignY === "bottom");
    this.wrapperOuter.classed(css.absPosHoriz, this._left);
    this.wrapperOuter.classed(css.alignXl, this._alignX === "left");
    this.wrapperOuter.classed(css.alignXr, this._alignX === "right");

    const setModel = this._setModel.bind(this);
    this
      .callback(setModel)
      .redraw();

    if (this._ready && this._showWhenReady) this.setHiddenOrVisible(false).showWhenReady(false);

    this.wrapper.select("." + css.search).node().value = "";

    return this;
  },

  focusSearch(focus = true) {
    const searchInput = this.wrapper.select("." + css.search).node();

    if (focus) {
      searchInput.focus();
    } else {
      searchInput.blur();
    }
  },

  _setModel(what, value) {

    value.value = {concept: value.concept};

    const mdl = this._targetModel;
    if (what == "which") mdl.setWhich(value);
    if (what == "scaleType") mdl.setScaleType(value);
    if (what == "space") mdl.setSpace(value.concept.split(","));
  }

});

export default TreeMenu;
