
import requireAll from "helpers/requireAll";
import * as utils from "base/utils";
import Tool from "base/tool";
import Class from "base/class";
import Component from "base/component";
//import Model from "base/model";
//import Reader from "base/reader";
import Events from "base/events";
import globals from "base/globals";
import * as iconset from "base/iconset";

const Vzb = function(name, placeholder, external_model) {
  const tool = Tool.get(name);
  if (tool) {
    const t = new tool(placeholder, external_model);
    Vzb._instances[t._id] = t;
    return t;
  }
  utils.error('Tool "' + name + '" was not found.');
};

//stores reference to each tool on the page
Vzb._instances = {};
//stores global variables accessible by any tool or component
Vzb._globals = globals;

//TODO: clear all objects and intervals as well
//garbage collection
Vzb.clearInstances = function(id) {
  if (id) {
    Vzb._instances[id] = void 0;
  } else {
    for (const i in Vzb._instances) {
      Vzb._instances[i].clear();
    }
    Vzb._instances = {};
  }
};

// //available readers = all
// const readers = requireAll(require.context("./readers", true, /\.js$/));

// //register available readers
// utils.forEach(readers, (reader, name) => {
//   Reader.register(name, reader);
// });


const components = requireAll(require.context("./components", true, /\.js$/), 1);

//register available components
utils.forEach(components, (component, name) => {
  Component.register(name, component);
});

requireAll(require.context("./components/dialogs", true, /\.js$/));


Vzb.helpers = requireAll(require.context("helpers", false, /\.js$/));
Vzb.iconset = iconset;

//d3 addons

import genericLog from "helpers/d3.genericLogScale";
import { onTap, onLongTap } from "helpers/d3.touchEvents";
//import * as touchFixes from 'helpers/d3.touchFixes';

//d3 v3 -> v4

// Copies a variable number of methods from source to target.
d3.rebind = function(target, source) {
  let i = 1, method;
  const n = arguments.length;
  while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
  return target;
};

// Method is assumed to be a standard D3 getter-setter:
// If passed with no arguments, gets the value.
// If passed with arguments, sets the value and returns the target.
function d3_rebind(target, source, method) {
  return function() {
    const value = method.apply(source, arguments);
    return value === source ? target : value;
  };
}


d3.scaleGenericlog = genericLog;
d3.selection.prototype.onTap = onTap;
d3.selection.prototype.onLongTap = onLongTap;

//TODO: Fix for scroll on mobile chrome on d3 v3.5.17. It must be retested/removed on d3 v4.x.x
//see explanation here https://github.com/vizabi/vizabi/issues/2020#issuecomment-250205191
//d3.svg.brush = touchFixes.brush;
//d3.drag = touchFixes.drag;
//d3.behavior.zoom = touchFixes.zoom;

//makes all objects accessible
Vzb.Class = Class;
Vzb.Tool = Tool;
Vzb.Component = Component;
//Vzb.Model = Model;
//Vzb.Reader = Reader;
Vzb.Events = Events;
Vzb.utils = utils;

export default Vzb;
