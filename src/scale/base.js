import { applyDefaults, isString } from "../utils";
import { isDate } from "../vizabiUtils";

const scales = {
    "linear": d3.scaleLinear,
    "log": d3.scaleLog,
    "sqrt": d3.scaleSqrt,
    "ordinal": d3.scaleOrdinal,
    "point": d3.scalePoint,
    "band": d3.scaleBand,
    "time": d3.scaleUtc
}


const defaultConfig = {
    domain: null,
    range: null,
    type: null
}

export function base(config = {}, parent) {

    applyDefaults(config, defaultConfig);

    return {
        config,
        parent,
        // ordinal, point or band
        ordinalScale: "ordinal",
        get data() {
            return this.parent.data;
        },
        get type() {
            const concept = this.data.conceptProps;
            let scaleType = null;
            let scale;
            if (scales[this.config.type])
                scaleType = this.config.type;
            else if (concept.scales && (scale = JSON.parse(concept.scales)[0]) && scales[scale])
                scaleType = scale;
            else if (["entity_domain", "entity_set", "string"].includes(concept.concept_type))
                scaleType = this.ordinalScale;
            else
                scaleType = "linear";
            return scaleType;
        },
        get range() {
            if (this.config.range != null)
                return this.config.range

            // default
            return (this.type == this.ordinalScale) ?
                d3.schemeCategory10 : [0, 1];
        },
        get domain() {
            if (this.config.domain)
                return this.config.domain;
            return this.data.domain;
        },
        get d3Scale() {
            const scale = scales[this.type]();
            const domain = (this.type == "log" && this.domain[0] == 0) ? [1, this.domain[1]] : this.domain;
            return scale.range(this.range).domain(domain);
        },
          /**
         * Gets tick values for this hook
         * @returns {Function} That returns the value for this tick
         */
        get tickFormatter() {

            const _this = this;
            const SHARE = "share";
            const PERCENT = "percent";

            // percentageMode works like rounded if set to SHARE, but multiplies by 100 and suffixes with "%"
            // percentageMode works like rounded if set to PERCENT, but suffixes with "%"

            return (x, index, group, removePrefix, percentageMode) => {

            percentageMode = _this.data.conceptProps.format;
            if (percentageMode === SHARE) x *= 100;

            // Format time values
            // Assumption: a hook has always time in its space
            if (isDate(x)) {
                return _this.parent.marker.encoding.get("frame").format.ui(x);
            }

            // Dealing with values that are supposed to be time
        //    if (_this.scaleType === "time" && !utils.isDate(x)) {
        //        return _this._space.time.formatDate(new Date(x));
        //    }

            // Strings, null, NaN and undefined are bypassing any formatter
            if (isString(x) || !x && x !== 0) return x;

            if (Math.abs(x) < 0.00000000000001) return "0";

            const format = "r"; //rounded format. use "f" for fixed
            const prec = 3; //round to so many significant digits

            let prefix = "";
            if (removePrefix) return d3.format("." + prec + format)(x);

            //---------------------
            // BEAUTIFIERS GO HOME!
            // don't break formatting please
            //---------------------
            // the tiny constant compensates epsilon-error when doing logsrithms
            /* eslint-disable */
            switch (Math.floor(Math.log(Math.abs(x)) / Math.LN10 + 0.00000000000001)) {
            case -13: x *= 1000000000000; prefix = "p"; break; //0.1p
            case -10: x *= 1000000000; prefix = "n"; break; //0.1n
            case -7: x *= 1000000; prefix = "µ"; break; //0.1µ
            case -6: x *= 1000000; prefix = "µ"; break; //1µ
            case -5: x *= 1000000; prefix = "µ"; break; //10µ
            case -4: break; //0.0001
            case -3: break; //0.001
            case -2: break; //0.01
            case -1: break; //0.1
            case 0:  break; //1
            case 1:  break; //10
            case 2:  break; //100
            case 3:  break; //1000
            case 4:  x /= 1000; prefix = "k"; break; //10k
            case 5:  x /= 1000; prefix = "k"; break; //100k
            case 6:  x /= 1000000; prefix = "M"; break; //1M
            case 7:  x /= 1000000; prefix = "M"; break; //10M
            case 8:  x /= 1000000; prefix = "M"; break; //100M
            case 9:  x /= 1000000000; prefix = "B"; break; //1B
            case 10: x /= 1000000000; prefix = "B"; break; //10B
            case 11: x /= 1000000000; prefix = "B"; break; //100B
            case 12: x /= 1000000000000; prefix = "TR"; break; //1TR
            case 13: x /= 1000000000000; prefix = "TR"; break; //10TR
            case 14: x /= 1000000000000; prefix = "TR"; break; //100TR
            //use the D3 SI formatting for the extreme cases
            default: return (d3.format("." + prec + "s")(x)).replace("G", "B");
            }
            /* eslint-enable */

            let formatted = d3.format("." + prec + format)(x);
            //remove trailing zeros if dot exists to avoid numbers like 1.0M, 3.0B, 1.500, 0.9700, 0.0
            if (formatted.indexOf(".") > -1) formatted = formatted.replace(/0+$/, "").replace(/\.$/, "");


            // use manual formatting for the cases above
            return (formatted + prefix + (percentageMode === PERCENT || percentageMode === SHARE ? "%" : ""));
            };
        },
    }
}