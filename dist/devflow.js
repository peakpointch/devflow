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
var devflow_exports = {};
__export(devflow_exports, {
  default: () => devflow
});
module.exports = __toCommonJS(devflow_exports);
var import_axios = __toESM(require("axios"));
var import_esbuild = require("esbuild");
var import_chalk = __toESM(require("chalk"));
var import_chokidar = __toESM(require("chokidar"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_cors = __toESM(require("cors"));
var import_events = __toESM(require("events"));
var import_express = __toESM(require("express"));
var import_express_ws = __toESM(require("express-ws"));
var import_path = __toESM(require("path"));
var import_strip_ansi = __toESM(require("strip-ansi"));
var import_cli = require("./cli");
var import_config = require("./config");
var import_assetReplacer = require("./helpers/assetReplacer");
var import_routes = require("./helpers/routes");
async function buildApp(config) {
  try {
    await (0, import_esbuild.build)({
      entryPoints: config.source,
      bundle: true,
      outdir: `${config.dist}`,
      sourcemap: true,
      minify: false,
      format: "iife",
      target: ["es2020"],
      platform: "browser",
      external: ["@vime/core"]
    });
    console.log(import_cli.prefixX, "Build done");
  } catch (err) {
    console.error(import_cli.prefixX, "Build failed:", err.message);
  }
}
function routeWfAuth(app, config) {
  app.post("/.wf_auth", async (req, res) => {
    var _a, _b, _c;
    try {
      const body = new URLSearchParams(req.body).toString();
      const _res = await import_axios.default.post(
        `https://${config.webflowSubdomain}.webflow.io/.wf_auth`,
        body,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": req.headers["user-agent"] || "",
            Cookie: req.headers.cookie || "",
            Origin: `https://${config.webflowSubdomain}.webflow.io`,
            Referer: `https://${config.webflowSubdomain}.webflow.io${((_a = req.headers.referer) == null ? void 0 : _a.replace(/^https?:\/\/[^/]+/, "")) || "/"}`,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache"
          },
          maxRedirects: 0,
          // don't auto-follow
          validateStatus: () => true,
          // let us handle 302/401/etc.
          withCredentials: true
        }
      );
      if (_res.headers["set-cookie"]) {
        res.setHeader("set-cookie", _res.headers["set-cookie"]);
      }
      if (_res.status >= 300 && _res.status < 400 && _res.headers.location) {
        return res.redirect(_res.status, _res.headers.location);
      }
      res.status(_res.status).send(_res.data);
    } catch (err) {
      console.error("Error proxying /.wf_auth", err.message);
      res.status(((_b = err.response) == null ? void 0 : _b.status) || 500).send(((_c = err.response) == null ? void 0 : _c.data) || "Auth error");
    }
  });
}
function startWebflowProxy(config, reloadEmitter) {
  const app = (0, import_express.default)();
  const wsInstance = (0, import_express_ws.default)(app);
  app.use(
    (0, import_cors.default)({
      credentials: true,
      origin: [/.*/]
    })
  );
  app.use((0, import_cookie_parser.default)());
  app.use(import_routes.routes.app, import_express.default.static(process.cwd()));
  app.use(import_routes.routes.devflow, import_express.default.static(import_path.default.resolve(__dirname, "..")));
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use(import_express.default.json());
  if (config.livereload) {
    wsInstance.app.ws(import_routes.routes.livereload, () => {
      console.log(import_cli.prefixX, "Auto Reload connection established");
    });
  }
  reloadEmitter.on("script-change", () => {
    wsInstance.getWss().clients.forEach((client) => config.livereload && client.send("reload"));
  });
  reloadEmitter.on("styles-change", () => {
    wsInstance.getWss().clients.forEach(
      (client) => config.livereload && client.send("reload-css")
    );
  });
  routeWfAuth(app, config);
  app.get("*", async (req, res) => {
    const startPref = Date.now();
    let isPage = false;
    let scriptsRemovedLog = "";
    try {
      if (req.url.includes("devtools")) return;
      const _res = await import_axios.default.get(
        `https://${config.webflowSubdomain}.webflow.io${req.url}`,
        {
          headers: {
            Referer: `https://${config.webflowSubdomain}.webflow.io${req.path}`,
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "User-Agent": req.headers["user-agent"] || "",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9,it;q=0.8",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "upgrade-insecure-requests": "1",
            Cookie: req.headers.cookie || ""
          },
          withCredentials: true
        }
      );
      const type = _res.headers["content-type"] || _res.headers["Content-Type"];
      let dataHtml = _res.data;
      if (type && type.includes("text/html")) {
        isPage = true;
        const result = (0, import_assetReplacer.replaceAssets)(dataHtml, config);
        scriptsRemovedLog = `Replaced ${result.removedCount} ${result.removedCount === 1 ? "asset" : "assets"}`;
        res.send(result.html);
      } else {
        res.send(_res.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        res.status(401).send(err.response.data);
      } else {
        console.log(import_cli.prefixX, "Page not found", req.path);
        res.send(
          `${(0, import_strip_ansi.default)(import_cli.prefixX)} page not found ${req.path} | status : ${err.message}`
        );
      }
    } finally {
      const endPref = Date.now();
      if (isPage) {
        console.log(
          import_cli.prefixX,
          "Page",
          import_chalk.default.cyan(req.url),
          `took ${endPref - startPref}ms to fetch`
        );
      }
      if (scriptsRemovedLog) {
        console.log(import_cli.prefixX, scriptsRemovedLog);
      }
    }
  });
  app.listen(config.port, () => {
    console.log(import_cli.prefixX, `local server http://localhost:${config.port}`);
  });
}
async function devflow(configFilePath) {
  const config = (0, import_config.parseConfig)(configFilePath);
  const reloadEmitter = new import_events.default.EventEmitter();
  console.log(import_cli.prefixX, "Read Documentation \u{1F4DA}: https://xatom.js.org/");
  await buildApp(config);
  startWebflowProxy(config, reloadEmitter);
  reloadEmitter.emit("script-change", config.source);
  const watcher = import_chokidar.default.watch(config.watchList, {
    ignoreInitial: true
  });
  watcher.on("all", async (_, filePath) => {
    if (/\.(js|ts)$/.test(filePath)) {
      console.log(import_cli.prefixX, "File change detected, rebuilding...");
      await buildApp(config);
      reloadEmitter.emit("script-change", config.source);
    } else if (/\.(css)$/.test(filePath)) {
      console.log(import_cli.prefixX, "CSS change detected, reloading stylesheets...");
      reloadEmitter.emit("styles-change", config.source);
    }
  });
}
