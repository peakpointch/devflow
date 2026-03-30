var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var builder_exports = {};
__export(builder_exports, {
  default: () => builder
});
module.exports = __toCommonJS(builder_exports);
var import_esbuild = require("esbuild");
var import_cli = require("./cli");
var import_config = __toESM(require("./config"));
async function builder(configFilePath) {
  try {
    const config = (0, import_config.default)(configFilePath);
    console.log(import_cli.prefixX, "Building production bundle...");
    await (0, import_esbuild.build)({
      entryPoints: config.source,
      bundle: true,
      outdir: config.dist,
      minify: true,
      sourcemap: true,
      format: "iife",
      target: ["ES2020"],
      treeShaking: true,
      platform: "browser",
      external: ["@vime/core"]
    });
    console.log(import_cli.prefixX, "Build done!");
  } catch (err) {
    console.error(import_cli.prefixX, "Build failed:", err);
  }
}
