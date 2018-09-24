import { applyDefaults } from "../utils";
import { resolveRef } from '../vizabi';
import { UI } from "../ui/ui";
//import { Locale } from "../locale/locale";
import { observable } from "mobx";

const defaultConfig = {
    marker: null,
    ui: null,
    locale: null
}

export function tool(config = {}, parent) {

    applyDefaults(config, defaultConfig);

    return {
        config,
        parent,
        get ui() {
            const config = resolveRef(this.config.ui);
            const parent = this;
            const model = observable(UI(config, parent));
            model.init();
            return model;
        },
        // get locale() {
        //     const config = resolveRef(this.config.ui);
        //     const parent = this;
        //     const model = observable(Locale(config, parent));
        //     model.init();
        //     return model;
        // },
    }
}