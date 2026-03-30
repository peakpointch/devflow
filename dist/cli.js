#! /usr/bin/env node
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
var cli_exports = {};
__export(cli_exports, {
  prefixX: () => prefixX
});
module.exports = __toCommonJS(cli_exports);
var import_yargs = __toESM(require("yargs"));
var import_helpers = require("yargs/helpers");
var import_builder = __toESM(require("./builder"));
var import_devflow = __toESM(require("./devflow"));
var import_initialize = __toESM(require("./initialize"));
var import_chalk = __toESM(require("chalk"));
const prefixX = `${import_chalk.default.bgMagenta(" xAtom ")} \u23E9`;
const configFileName = "devflow.json";
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).command(
  "dev [config]",
  "to start dev server",
  (yargs2) => {
    return yargs2.positional("config", {
      describe: "config file path",
      default: configFileName
    });
  },
  (arg) => {
    (0, import_devflow.default)(arg.config);
  }
).command(
  "build [config]",
  "build production bundle",
  (yargs2) => {
    return yargs2.positional("config", {
      describe: "config file path",
      default: configFileName
    });
  },
  (arg) => {
    (0, import_builder.default)(arg.config);
  }
).command(
  "init [file]",
  "create devflow.json configuration file",
  (yargs2) => {
    return yargs2.positional("file", {
      describe: "config file name",
      default: configFileName
    });
  },
  (arg) => {
    (0, import_initialize.default)(arg.file);
  }
).help().demandCommand().recommendCommands().parse();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  prefixX
});
