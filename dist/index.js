#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixX = void 0;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const buildServer_1 = __importDefault(require("./buildServer"));
const devServer_1 = require("./devServer");
const initConfig_1 = __importDefault(require("./initConfig"));
const chalk_1 = __importDefault(require("chalk"));
exports.prefixX = `${chalk_1.default.bgMagenta(" xAtom ")} ⏩`;
(0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .command("dev [config]", "to start dev server", (yargs) => {
    return yargs.positional("config", {
        describe: "config file path",
        default: "xatom.json",
    });
}, (arg) => {
    (0, devServer_1.loadDevServer)(arg.config);
})
    .command("build [config]", "build production bundle", (yargs) => {
    return yargs.positional("config", {
        describe: "config file path",
        default: "xatom.json",
    });
}, (arg) => {
    (0, buildServer_1.default)(arg.config);
})
    .command("init [file]", "create xatom.json configuration file", (yargs) => {
    return yargs.positional("file", {
        describe: "config file name",
        default: "xatom.json",
    });
}, (arg) => {
    (0, initConfig_1.default)(arg.file);
})
    .help()
    .demandCommand()
    .recommendCommands()
    .parse();
