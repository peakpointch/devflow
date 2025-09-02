"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = builder;
const esbuild_1 = require("esbuild");
const parse_config_1 = __importDefault(require("./parse-config"));
const cli_1 = require("./cli");
function builder(configFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const config = (0, parse_config_1.default)(configFilePath);
            console.log(cli_1.prefixX, "Building production bundle...");
            yield (0, esbuild_1.build)({
                entryPoints: config.source,
                bundle: true,
                outdir: config.dist,
                minify: true,
                sourcemap: true,
                format: "iife",
                target: ["ES2020"],
                treeShaking: true,
                platform: "browser",
                external: ["@vime/core"],
            });
            console.log(cli_1.prefixX, "Build done!");
        }
        catch (err) {
            console.error(cli_1.prefixX, "Build failed:", err);
        }
    });
}
