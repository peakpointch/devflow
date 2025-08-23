#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixX = void 0;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const builder_1 = __importDefault(require("./builder"));
const devflow_1 = __importDefault(require("./devflow"));
const initialize_1 = __importDefault(require("./initialize"));
const chalk_1 = __importDefault(require("chalk"));
exports.prefixX = `${chalk_1.default.bgMagenta(" xAtom ")} ⏩`;
const configFileName = "devflow.json";
(0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .command("dev [config]", "to start dev server", (yargs) => {
    return yargs.positional("config", {
        describe: "config file path",
        default: configFileName,
    });
}, (arg) => {
    (0, devflow_1.default)(arg.config);
})
    .command("build [config]", "build production bundle", (yargs) => {
    return yargs.positional("config", {
        describe: "config file path",
        default: configFileName,
    });
}, (arg) => {
    (0, builder_1.default)(arg.config);
})
    .command("init [file]", "create devflow.json configuration file", (yargs) => {
    return yargs.positional("file", {
        describe: "config file name",
        default: configFileName,
    });
}, (arg) => {
    (0, initialize_1.default)(arg.file);
})
    .help()
    .demandCommand()
    .recommendCommands()
    .parse();
