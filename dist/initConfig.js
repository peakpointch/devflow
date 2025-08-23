"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = initConfig;
const parseConfig_1 = require("./parseConfig");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _1 = require(".");
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
    if ((0, parseConfig_1.checkFileExists)(filePath)) {
        console.log(_1.prefixX, `looks like a ${filePath} config file already exists`);
        return;
    }
    fs_1.default.writeFileSync(path_1.default.resolve(filePath), template);
    console.log(_1.prefixX, `${filePath} created successfully ✅`);
}
