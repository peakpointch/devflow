var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var dataset_exports = {};
__export(dataset_exports, {
  dataset: () => dataset
});
module.exports = __toCommonJS(dataset_exports);
var import_selector = require("peakflow/selector");
const dataset = import_selector.Dataset.define({
  hmr: import_selector.Dataset.Boolean("data-devflow-hmr"),
  local: import_selector.Dataset.String("data-devflow-local"),
  href: import_selector.Dataset.String("href")
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dataset
});
