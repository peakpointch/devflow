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
exports.loadDevServer = exports.loadProxyServer = void 0;
const esbuild_1 = require("esbuild");
const chokidar_1 = __importDefault(require("chokidar"));
const express_1 = __importDefault(require("express"));
const express_ws_1 = __importDefault(require("express-ws"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const events_1 = __importDefault(require("events"));
const parseConfig_js_1 = __importDefault(require("../dist/parseConfig.js"));
const prefixX = "⚛️  xAtom  👉";
// -----------------------------
// Dev build with esbuild + chokidar
// -----------------------------
const loadEsbuildDev = (src, dist, reloadEmitter, onInitCB) => __awaiter(void 0, void 0, void 0, function* () {
    let init = false;
    const buildOnce = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield (0, esbuild_1.build)({
                entryPoints: Array.isArray(src) ? src : [src],
                bundle: true,
                outdir: dist,
                sourcemap: true,
                minify: false,
                splitting: true,
                format: "esm",
                target: ["es2020"],
                platform: "browser",
            });
            if (!init) {
                init = true;
                onInitCB();
            }
            reloadEmitter.emit("file-changes", src);
            console.log(prefixX, "Build done");
        }
        catch (err) {
            console.error(prefixX, "Build failed:", err.message);
        }
    });
    // Initial build
    yield buildOnce();
    // Watch for changes
    const watcher = chokidar_1.default.watch(src, { ignoreInitial: true });
    watcher.on("all", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log(prefixX, "File change detected, rebuilding...");
        yield buildOnce();
    }));
});
// -----------------------------
// Proxy server
// -----------------------------
const loadProxyServer = (webflowSubdomain, port, distPath, scriptList, scriptToRemove, reloadEmitter) => {
    const app = (0, express_1.default)();
    const wsInstance = (0, express_ws_1.default)(app); // typed wrapper
    app.use((0, cors_1.default)({
        credentials: true,
        origin: [/.*/],
    }));
    app.use((0, cookie_parser_1.default)());
    app.use("/____xatom_js", express_1.default.static(path_1.default.resolve(distPath)));
    wsInstance.app.ws("/___xatom-reload", (ws) => {
        console.log(prefixX, "Auto Reload connection established");
    });
    reloadEmitter.on("file-changes", () => {
        wsInstance.getWss().clients.forEach((client) => client.send("reload"));
    });
    const reloadScript = /*html */ `<script>
    if ("WebSocket" in window) {
      (function(){
        const xAtomAutoReloadURL = "ws://localhost:${port}/___xatom-reload";
        const socket = new WebSocket(xAtomAutoReloadURL);
        socket.onmessage = function(event){
          if(event.data === "reload"){
            window.location.reload();
          }else
            console.log(event);
        }
      })()
    }
  </script>`;
    const finalScriptPaths = [
        reloadScript,
        scriptList.map((d) => `<script src="/____xatom_js/${d}"></script>`),
    ]
        .flat()
        .join("");
    app.get("*", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const startPref = Date.now();
        let isPage = false;
        try {
            const _res = yield axios_1.default.get(`https://${webflowSubdomain}.webflow.io${req.url}`, {
                headers: {
                    Referer: `https://${webflowSubdomain}.webflow.io${req.path}`,
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "User-Agent": req.headers["user-agent"] || "",
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9,it;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    "upgrade-insecure-requests": "1",
                    Cookie: req.headers.cookie || "",
                },
                withCredentials: true,
            });
            const type = _res.headers["content-type"] || _res.headers["Content-Type"];
            let dataHtml = _res.data;
            if (type && type.includes("text/html")) {
                isPage = true;
                scriptToRemove = Array.isArray(scriptToRemove)
                    ? scriptToRemove
                    : [scriptToRemove];
                if (scriptToRemove.length) {
                    dataHtml = dataHtml.replace(new RegExp(`<script\\b[^>]*(?:${scriptToRemove.join("|")}(?: {1}|="))\\b[^>]*>([\\s\\S]*?)<\\/script>`, "mg"), (e) => {
                        console.log(prefixX, "ÔÜá´©Å   Script Removed", e);
                        return "";
                    });
                }
                res.send(dataHtml.replace("</body>", `${finalScriptPaths}</body>`));
            }
            else {
                res.send(_res.data);
            }
        }
        catch (err) {
            console.log(prefixX, "Page not found", req.path);
            res.send(`${prefixX} page not found ${req.path} | status : ${err.message}`);
        }
        finally {
            const endPref = Date.now();
            if (isPage)
                console.log(prefixX, "Page", req.url, `took ${endPref - startPref}ms to fetch`);
        }
    }));
    app.listen(port, () => {
        console.log(prefixX, `local server http://localhost:${port}`);
    });
};
exports.loadProxyServer = loadProxyServer;
// -----------------------------
// Load dev server
// -----------------------------
const loadDevServer = (configFilePath) => {
    const config = (0, parseConfig_js_1.default)(configFilePath);
    const reloadEmitter = new events_1.default.EventEmitter();
    console.log(prefixX, "Read Documentation 📚: https://xatom.js.org/");
    loadEsbuildDev(config.source, config.dist, reloadEmitter, () => {
        (0, exports.loadProxyServer)(config.webflowSubdomain, config.port, config.dist, config.scriptList, config.scriptAttribute, reloadEmitter);
    });
};
exports.loadDevServer = loadDevServer;
