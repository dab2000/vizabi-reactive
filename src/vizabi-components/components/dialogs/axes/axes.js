import * as utils from "base/utils";
import Component from "base/component";
import Dialog from "components/dialogs/_dialog";

import indicatorpicker from "components/indicatorpicker/indicatorpicker";
import minmaxinputs from "components/minmaxinputs/minmaxinputs";

/*
 * Axes dialog
 */

const Axes = Dialog.extend("axes", {

  /**
   * Initializes the dialog component
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, parent) {
    this.name = "axes";
    const _this = this;

    this.components = [{
      component: indicatorpicker,
      placeholder: ".vzb-xaxis-selector",
      model: [config.modelConfig.frame, config.modelConfig.marker + ".encoding:x", "locale"],
    }, {
      component: minmaxinputs,
      placeholder: ".vzb-xaxis-minmax",
      model: [config.modelConfig.frame, config.modelConfig.marker, "locale"],
      markerID: "x",
      ui: {
        selectDomainMinMax: true,
        selectZoomedMinMax: false
        // selectDomainMinMax: false,
        // selectZoomedMinMax: true
      }
    }, {
      component: indicatorpicker,
      placeholder: ".vzb-yaxis-selector",
      model: [config.modelConfig.frame, config.modelConfig.marker + ".encoding:y", "locale"],
    }, {
      component: minmaxinputs,
      placeholder: ".vzb-yaxis-minmax",
      model: [config.modelConfig.frame, config.modelConfig.marker, "locale"],
      markerID: "y",
      ui: {
        selectDomainMinMax: true,
        selectZoomedMinMax: false
        // selectDomainMinMax: false,
        // selectZoomedMinMax: true
      }
    }];

    this._super(config, parent);
  }
});

export default Axes;
