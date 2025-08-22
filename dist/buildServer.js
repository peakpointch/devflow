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
const esbuild_1 = require("esbuild");
const parseConfig_js_1 = __importDefault(require("../dist/parseConfig.js"));
const prefixX = "⚛️  xAtom  👉";
const buildServer = (configFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const config = (0, parseConfig_js_1.default)(configFilePath);
        console.log(prefixX, "Building production bundle...");
        const result = yield (0, esbuild_1.build)({
            entryPoints: config.source,
            bundle: true,
            outdir: config.dist,
            minify: true,
            sourcemap: true,
            target: ["es2020"], // adjust target as needed
            format: "esm", // output as ESM; use "cjs" if needed
            splitting: true, // enable code splitting
            treeShaking: true,
            platform: "browser",
            external: [], // add dependencies to exclude if needed
        });
        console.log(prefixX, "Build done!", `Total ${((_a = result.outputFiles) === null || _a === void 0 ? void 0 : _a.length) || "N/A"} files built`);
    }
    catch (err) {
        console.error(prefixX, "Build failed:", err);
    }
});
exports.default = buildServer;
