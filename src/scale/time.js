import { applyDefaults, assign } from "../utils";
import { base } from "./base";

const defaultConfig = {}

export function time(config, parent) {

    applyDefaults(config, defaultConfig);
    const s = base(config, parent);

    return assign(s, {
        get domain() {
            // function is used by scale so this refers to scale, not frame
            if (this.config.domain) return this.config.domain;
            return d3.extent([...(this.parent.frameMapCache || this.parent.marker.encoding.get("frame").frameMapCache).keys()])
                .map(d => Date.UTC(d));
        },
    });
}