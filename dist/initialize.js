"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = initConfig;
const parse_config_1 = require("./parse-config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cli_1 = require("./cli");
const template = `{
  "webflowSubdomain": "YOUR_WEBFLOW_SUBDOMAIN",
  "port": 3020,
  "source": "./src/app.ts",
  "dist": "./dist",
  "scriptList": ["app.js"],
  "scriptAttribute": "replace-it"
}
`;
function initConfig(filePath) {
    if ((0, parse_config_1.fileExists)(filePath)) {
        console.log(cli_1.prefixX, `looks like a ${filePath} config file already exists`);
        return;
    }
    fs_1.default.writeFileSync(path_1.default.resolve(filePath), template);
    console.log(cli_1.prefixX, `${filePath} created successfully ✅`);
}
