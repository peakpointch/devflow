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
exports.default = devflow;
const esbuild_1 = require("esbuild");
const chokidar_1 = __importDefault(require("chokidar"));
const express_1 = __importDefault(require("express"));
const express_ws_1 = __importDefault(require("express-ws"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const events_1 = __importDefault(require("events"));
const parse_config_1 = __importDefault(require("./parse-config"));
const chalk_1 = __importDefault(require("chalk"));
const cli_1 = require("./cli");
// -----------------------------
// Build app with esbuild
// -----------------------------
function buildApp(config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, esbuild_1.build)({
                entryPoints: Array.isArray(config.source)
                    ? config.source
                    : [config.source],
                bundle: true,
                outdir: `${config.dist}`,
                sourcemap: true,
                minify: false,
                format: "iife",
                target: ["es2020"],
                platform: "browser",
                external: ["@vime/core"],
            });
            console.log(cli_1.prefixX, "Build done");
        }
        catch (err) {
            console.error(cli_1.prefixX, "Build failed:", err.message);
        }
    });
}
// -----------------------------
// Proxy server
// -----------------------------
function startWebflowProxy(config, reloadEmitter) {
    const routes = {
        livereload: "/__livereload",
        dist: "/__dist",
    };
    const app = (0, express_1.default)();
    const wsInstance = (0, express_ws_1.default)(app); // typed wrapper
    app.use((0, cors_1.default)({
        credentials: true,
        origin: [/.*/],
    }));
    app.use((0, cookie_parser_1.default)());
    app.use(routes.dist, express_1.default.static(path_1.default.resolve(config.dist)));
    wsInstance.app.ws(routes.livereload, () => {
        console.log(cli_1.prefixX, "Auto Reload connection established");
    });
    reloadEmitter.on("script-change", () => {
        wsInstance.getWss().clients.forEach((client) => client.send("reload"));
    });
    reloadEmitter.on("styles-change", () => {
        wsInstance.getWss().clients.forEach((client) => client.send("reload-css"));
    });
    const reloadScript = `<script>
  if ("WebSocket" in window) {
    (function () {
      const devflowLivereloadURL =
        "ws://localhost:${config.port}${routes.livereload}";
      const socket = new WebSocket(devflowLivereloadURL);
      socket.onmessage = function (event) {
        if (event.data === "reload") {
          window.location.reload();
        } else if (event.data === "reload-css"){
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"][data-dyn-css="true"]');
          stylesheets.forEach((sheet) => {
            const url = new URL(sheet.href);
            url.searchParams.set("t", Date.now().toString());
            sheet.href = url.toString();
          });
        } else console.log(event);
      };
    })();
  }
  </script>`;
    const stylesheetTags = [].flat().join("");
    const scriptTags = [
        reloadScript,
        config.scriptList.map((script) => `<script src="${routes.dist}/${script}"></script>`),
    ]
        .flat()
        .join("");
    let scriptsRemovedLog = "";
    app.get("*", (req, res) => __awaiter(this, void 0, void 0, function* () {
        const startPref = Date.now();
        let isPage = false;
        try {
            // Skip devtools
            if (req.url.includes("devtools"))
                return;
            const _res = yield axios_1.default.get(`https://${config.webflowSubdomain}.webflow.io${req.url}`, {
                headers: {
                    Referer: `https://${config.webflowSubdomain}.webflow.io${req.path}`,
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
                config.scriptAttribute = Array.isArray(config.scriptAttribute)
                    ? config.scriptAttribute
                    : [config.scriptAttribute];
                if (config.scriptAttribute.length) {
                    dataHtml = dataHtml.replace(new RegExp(`<script\\b[^>]*(?:${config.scriptAttribute.join("|")}(?: {1}|="))\\b[^>]*>([\\s\\S]*?)<\\/script>`, "mg"));
                }
                scriptsRemovedLog = `Scripts removed ${config.scriptAttribute.length}/${config.scriptAttribute.length}`;
                res.send(dataHtml.replace("</body>", `${scriptTags}</body>`));
            }
            else {
                res.send(_res.data);
            }
        }
        catch (err) {
            console.log(cli_1.prefixX, "Page not found", req.path);
            res.send(`${cli_1.prefixX} page not found ${req.path} | status : ${err.message}`);
        }
        finally {
            const endPref = Date.now();
            if (isPage) {
                console.log(cli_1.prefixX, "Page", chalk_1.default.cyan(req.url), `took ${endPref - startPref}ms to fetch`);
            }
            if (scriptsRemovedLog) {
                console.log(cli_1.prefixX, scriptsRemovedLog);
                scriptsRemovedLog = "";
            }
        }
    }));
    app.listen(config.port, () => {
        console.log(cli_1.prefixX, `local server http://localhost:${config.port}`);
    });
}
// -----------------------------
// Start Devflow
// -----------------------------
function devflow(configFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = (0, parse_config_1.default)(configFilePath);
        const reloadEmitter = new events_1.default.EventEmitter();
        console.log(cli_1.prefixX, "Read Documentation 📚: https://xatom.js.org/");
        // Initial build
        yield buildApp(config);
        // Start webflow proxy server, mirroring the .webflow.io staging domain
        startWebflowProxy(config, reloadEmitter);
        reloadEmitter.emit("script-change", config.source);
        // Watch for changes
        const watcher = chokidar_1.default.watch(["src/"], {
            ignoreInitial: true,
        });
        watcher.on("all", (_, filePath) => __awaiter(this, void 0, void 0, function* () {
            if (/\.(js|ts)$/.test(filePath)) {
                console.log(cli_1.prefixX, "File change detected, rebuilding...");
                yield buildApp(config);
                reloadEmitter.emit("script-change", config.source);
            }
            else if (/\.(css)$/.test(filePath)) {
                console.log(cli_1.prefixX, "CSS change detected, reloading stylesheets...");
                reloadEmitter.emit("styles-change", config.source);
            }
        }));
    });
}
