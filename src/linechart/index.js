//import "./styles.scss";
import Tool from "../vizabi-stub/base/tool";
import timeslider from "../vizabi-stub/components/timeslider/timeslider";
import treemenu from "../vizabi-stub/components/treemenu/treemenu"
import component from "./component";
import { createTransformer } from "mobx-utils";

//const VERSION_INFO = { version: __VERSION, build: __BUILD };

// LINE CHART TOOL
const LineChart = Tool.extend("LineChart", {
  /**
   * Initialized the tool
   * @param {Object} placeholder Placeholder element for the tool
   * @param {Object} external_model Model as given by the external page
   */
  init(placeholder, external_model) {

    this.name = "linechart";

    this.components = [{
      component,
      placeholder: ".vzb-tool-viz",
      model: ["marker:bubble.encoding:frame", "marker:bubble", "locale", "ui"] //pass models to component
    }, {
      component: timeslider,
      placeholder: ".vzb-tool-timeslider",
      model: ["marker:bubble.encoding:frame", "marker:bubble", "ui"],
      ui: { show_value_when_drag_play: true, axis_aligned: false }
/*    }, {
      component: Vizabi.Component.get("dialogs"),
      placeholder: ".vzb-tool-dialogs",
      model: ["state", "ui", "locale"]
    }, {
      component: Vizabi.Component.get("buttonlist"),
      placeholder: ".vzb-tool-buttonlist",
      model: ["state", "ui", "locale"]
      */
    }, {
      component: treemenu,
      placeholder: ".vzb-tool-treemenu",
      model: ["marker:bubble", "marker:bubble.encoding:frame", "locale", "ui", "dataSource"]
/*    }, {
      component: Vizabi.Component.get("datawarning"),
      placeholder: ".vzb-tool-datawarning",
      model: ["locale"]
    }, {
      component: Vizabi.Component.get("datanotes"),
      placeholder: ".vzb-tool-datanotes",
      model: ["state.marker", "locale"]
    }, {
      component: Vizabi.Component.get("steppedspeedslider"),
      placeholder: ".vzb-tool-stepped-speed-slider",
      model: ["state.time", "locale"]
*/
    }];

    this._super(placeholder, external_model);
  },

  default_model: {
/*    "state": {
      "time": {
        "autoconfig": {
          "type": "time"
        }
      },
      "entities": {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      "entities_colorlegend": {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      "entities_tags": {
        "autoconfig": {
          "type": "entity_domain",
          "includeOnlyIDs": ["tag"]
        }
      },
      "marker_tags": {
        "space": ["entities_tags"],
        "label": {
          "use": "property",
        },
        "hook_parent": {}
      },
      "marker": {
        limit: 5000,
        "space": ["entities", "time"],
        "axis_x": {
          "use": "indicator",
          "allow": { scales: ["time"] },
          "autoconfig": {
            "index": 0,
            "type": "time"
          }
        },
        "axis_y": {
          "use": "indicator",
          "allow": { scales: ["linear", "log"] },
          "autoconfig": {
            "type": "measure"
          }
        },
        "label": {
          "use": "property",
          "autoconfig": {
            "includeOnlyIDs": ["name"],
            "type": "string"
          }
        },
        "color": {
          "syncModels": ["marker_colorlegend"],
          "autoconfig": {}
        }
      },
      "marker_colorlegend": {
        "space": ["entities_colorlegend"],
        "label": {
          "use": "property",
          "which": "name"
        },
        "hook_rank": {
          "use": "property",
          "which": "rank"
        },
        "hook_geoshape": {
          "use": "property",
          "which": "shape_lores_svg"
        }
      }
    },
    */
    locale: { },
    "ui": {
      "chart": {
        "curve": "curveMonotoneX",
        "labels": {
          "min_number_of_entities_when_values_hide": 2 //values hide when showing 2 entities or more
        },
        "whenHovering": {
          "hideVerticalNow": false,
          "showProjectionLineX": true,
          "showProjectionLineY": true,
          "higlightValueX": true,
          "higlightValueY": true,
          "showTooltip": false
        }
      },
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      },
      "buttons": ["colors", "find", "moreoptions", "fullscreen", "presentation"],
      "dialogs": {
        "popup": ["colors", "find", "moreoptions"],
        "sidebar": ["colors", "find"],
        "moreoptions": ["opacity", "speed", "axes", "colors", "presentation", "about"],
        "dialog": {"find": {"panelMode": "show"}}
      },
      "presentation": false
    }
  },

  //versionInfo: VERSION_INFO
});

export default LineChart;
