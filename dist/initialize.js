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
var initialize_exports = {};
__export(initialize_exports, {
  default: () => initConfig
});
module.exports = __toCommonJS(initialize_exports);
var import_config = require("./config");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_cli = require("./cli");
const template = `{
  "webflowSubdomain": "YOUR_WEBFLOW_SUBDOMAIN",
  "port": 3000,
  "livereload": true,
  "source": ["./src/app.ts"],
  "dist": "./dist",
  "watchList": ["./src/"],
}
`;
function initConfig(filePath) {
  if ((0, import_config.fileExists)(filePath)) {
    console.log(import_cli.prefixX, `looks like a ${filePath} config file already exists`);
    return;
  }
  import_fs.default.writeFileSync(import_path.default.resolve(filePath), template);
  console.log(import_cli.prefixX, `${filePath} created successfully \u2705`);
}
