import { applyDefaults, assign } from "../utils";
import { base } from "./base";

const defaultConfig = {}

export function frame(config, parent) {

    applyDefaults(config, defaultConfig);
    const s = base(config, parent);

    return assign(s, {
        get type() {
            return this.parent.marker.encoding.get("frame").unit ? "time" : "linear";
        },
        get domain() {
            const frameEnc = this.parent.marker.encoding.get("frame");
            let keys = [...frameEnc.frameMapCache.keys()];

            if (this.config.domain) {
                const domain = this.config.domain.map(d => frameEnc.format.data.parse(d));
                keys = keys.filter(key => key >= domain[0] && key <= domain[1]);
            }
            // function is used by scale so this refers to scale, not frame
            return d3.extent(keys);
        },
    });
}