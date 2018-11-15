import { baseEncoding } from './baseEncoding';
import { defaultDecorator, deepmerge } from '../utils';
import { action, trace } from 'mobx';

const defaultPalettes = {
    "_continuous": {
      "_default": "#ffb600",
      "0": "hsl(270, 80%, 55%)",
      "25": "hsl(202.5, 80%, 55%)",
      "50": "hsl(135, 80%, 55%)",
      "75": "hsl(48, 70%, 62%)",
      "100": "hsl(0, 80%, 55%)"
    },
    "_discrete": {
      "_default": "#ffb600",
      "0": "#4cd843",
      "1": "#e83739",
      "2": "#ff7f00",
      "3": "#c027d4",
      "4": "#d66425",
      "5": "#0ab8d8",
      "6": "#bcfa83",
      "7": "#ff8684",
      "8": "#ffb04b",
      "9": "#f599f5",
      "10": "#f4f459",
      "11": "#7fb5ed"
    },
    "_default": {
      "_default": "#ffb600"
    }
  };

const defaultConfig = {
  palette: {},
  paletteLabels: null
};

export const color = defaultDecorator({
    base: baseEncoding,
    defaultConfig,
    functions: {
        get palette() {
            return deepmerge(this.defaultPalette, this.config.palette);
        },
        get defaultPalette() {
            const conceptpropsColor = this.data.conceptProps.color;
            let palette;
        
            this.discreteDefaultPalette = false;
        
            if (conceptpropsColor && conceptpropsColor.palette) {
              //specific color palette from hook concept properties
              palette = Object.assign({}, conceptpropsColor.palette);
            } else if (defaultPalettes[this.data.concept]) {
              //color palette for this.data.concept exists in palette defaults
              palette = Object.assign({}, defaultPalettes[this.data.concept]);
            } else if (this.use === "constant") {
              //an explicit hex color constant #abc or #adcdef is provided
              if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(this.data.concept)) {
                palette = { "_default": this.data.concept };
              } else {
                palette = Object.assign({}, defaultPalettes["_default"]);
              }
            } else {
              palette = Object.assign({}, defaultPalettes[this.type == "ordinal" ? "_discrete" : "_continuous"]);
              this.discreteDefaultPalette = true;
            }

            if (this.scale.type !== "ordinal") {
                delete palette["_default"];
            }
  
            return palette;
        },
        get paletteLabels() {
          const conceptpropsColor = this.data.conceptProps.color;
            let paletteLabels = null;
        
            if (conceptpropsColor && conceptpropsColor.paletteLabels) {
              //specific color palette from hook concept properties
              paletteLabels = Object.assign({}, conceptpropsColor.paletteLabels);
            }
            return paletteLabels;
        },    
        getColorShade(args) {        
            if (!args) return utils.warn("getColorShade() is missing arguments");
        
            // if colorID is not given or not found in the palette, replace it with default color
            //if (!args.colorID || !palette[args.colorID]) args.colorID = "_default";
        
            // if the resolved colr value is not an array (has only one shade) -- return it
            if (!Array.isArray(this.palette[args.colorID])) return args.shadeID == "shade" ? d3.rgb(this.palette[args.colorID] || this.scale.d3Scale(args.colorID)).darker(0.5).toString() : this.palette[args.colorID];
        
            const conceptpropsColor = this.data.conceptProps.color;
            const shade = args.shadeID && conceptpropsColor && conceptpropsColor.shades && conceptpropsColor.shades[args.shadeID] ? conceptpropsColor.shades[args.shadeID] : 0;
        
            return this.palette[args.colorID][shade];
        },
        setColor: action(function (value, pointer) {
          this.config.palette[pointer] = value;
        }),
      
    }
});