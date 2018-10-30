import { applyDefaults, assign } from "../utils";
import { capitalize } from "../vizabiUtils";
import { base } from "./base";

const defaultConfig = {}

const colors = {
    schemeCategory10: d3.schemeCategory10
}

export function color(config, parent) {

    applyDefaults(config, defaultConfig);
    const s = base(config, parent);

    return assign(s, {
        // get range() {
        //     const range = this.config.range;
        //     if (isString(range) && colors[range]) {
        //         return colors[range];
        //     } else if (Array.isArray(range)) {
        //         return range;
        //     }

        //     return (this.type == "ordinal") ?
        //         d3.schemeCategory10 : ["red", "green"];
        // },
        get d3Scale() {
            const scaleType = this.type;

            const paletteObject = this.parent.palette;
            let domain = Object.keys(paletteObject);
            let range = Object.values(paletteObject);
            let scale;

            this._hasDefaultColor = domain.indexOf("_default") > -1;
        
            if (scaleType == "time") {
        
              const timeMdl = this._space.time;
              const limits = timeMdl.splash ?
                { min: timeMdl.parse(timeMdl.startOrigin), max: timeMdl.parse(timeMdl.endOrigin) }
                :
                { min: timeMdl.start, max: timeMdl.end };
        
              const singlePoint = (limits.max - limits.min == 0);
        
              domain = domain.sort((a, b) => a - b);
              range = domain.map(m => singlePoint ? paletteObject[domain[0]] : paletteObject[m]);
              domain = domain.map(m => limits.min.valueOf() + m / 100 * (limits.max.valueOf() - limits.min.valueOf()));
        
              scale = d3.scaleUtc()
                .domain(domain)
                .range(range)
                .interpolate(d3.interpolateCubehelix);
        
            } else if (!this.isDiscrete) {
        
              let limits = this.domain;//this.getLimits(this.which);
              //default domain is based on limits
              //limits = [limits.min, limits.max];
        
              const singlePoint = (limits[1] - limits[0] == 0);
        
              domain = domain.sort((a, b) => a - b);
              range = domain.map(m => singlePoint ? paletteObject[domain[0]] : paletteObject[m]);
              domain = domain.map(m => limits[0] + m / 100 * (limits[1] - limits[0]));
        
              if (d3.min(domain) <= 0 && d3.max(domain) >= 0 && scaleType === "log") scaleType = "genericLog";
        
              if (scaleType === "log" || scaleType === "genericLog") {
                const s = d3.scaleGenericlog()
                  .domain(limits)
                  .range(limits);
                domain = domain.map(d => s.invert(d));
              }
              scale = d3[`scale${capitalize(scaleType)}`]()
                .domain(domain)
                .range(range)
                .interpolate(d3.interpolateCubehelix);
        
            } else {
              range = range.map(m => Array.isArray(m) ? m[0] : m);
        
              //scaleType = "ordinal";
        
              if (this.discreteDefaultPalette) {
                const defaultPalette = Object.assign({}, defaultPalettes["_discrete"]);
                delete defaultPalette["_default"];
                const defaultPaletteKeys = Object.keys(defaultPalette);
        
                domain = [].concat(this.getUnique(this.which));
                range = domain.map((d, i) => paletteObject[d] || defaultPalette[defaultPaletteKeys[i % defaultPaletteKeys.length]]);
                domain.push("_default");
                range.push(paletteObject["_default"]);
              }
        
              scale = d3[`scale${capitalize(scaleType)}`]()
                .domain(domain)
                .range(range);
            }
                
            return scale;
        },
    });
}