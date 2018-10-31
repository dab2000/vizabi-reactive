import * as utils from "base/utils";
import Component from "base/component";
import Dialog from "components/dialogs/_dialog";

import colorlegend from "components/colorlegend/colorlegend";
import indicatorpicker from "components/indicatorpicker/indicatorpicker";

/*!
 * VIZABI COLOR DIALOG
 */

const Colors = Dialog.extend("colors", {

  /**
   * Initializes the dialog component
   * @param config component configuration
   * @param context component context (parent)
   */
  init(config, parent) {
    this.name = "colors";

    this.components = [{
      component: indicatorpicker,
      placeholder: ".vzb-caxis-selector",
      model: [config.modelConfig.frame, config.modelConfig.marker + ".encoding:color", "locale"],
      ui: { showHoverValues: true }
    }, {
      component: colorlegend,
      placeholder: ".vzb-clegend-container",
      model: [config.modelConfig.frame, config.modelConfig.marker, config.modelConfig.legendMarker, config.modelConfig.marker + ".encoding:color", "locale", "ui"]
    }];


    this._super(config, parent);
  }

});

export default Colors;
