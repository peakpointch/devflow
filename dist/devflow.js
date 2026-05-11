import axios from "axios";
import { build } from "esbuild";
import chalk from "chalk";
import chokidar from "chokidar";
import cookieParser from "cookie-parser";
import cors from "cors";
import events from "events";
import express from "express";
import expressWs from "express-ws";
import path from "path";
import { parseConfigCli as parseConfigAction } from "./config.js";
import { replaceAssets } from "./helpers/assetReplacer.js";
import { routes } from "./helpers/routes.js";
import logger from "./helpers/logger.js";
async function buildApp(config) {
  try {
    await build({
      entryPoints: config.build.modules,
      bundle: true,
      outdir: config.build.outdir,
      sourcemap: true,
      minify: false,
      format: "iife",
      target: ["es2020"],
      platform: "browser",
      external: ["@vime/core"]
    });
    logger.info(`Build Complete`);
  } catch (err) {
    logger.error("Build failed!\n", err);
  }
}
function routeWfAuth(app, config) {
  app.post("/.wf_auth", async (req, res) => {
    try {
      const body = new URLSearchParams(req.body).toString();
      const _res = await axios.post(
        `https://${config.server.webflowSubdomain}.webflow.io/.wf_auth`,
        body,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": req.headers["user-agent"] || "",
            Cookie: req.headers.cookie || "",
            Origin: `https://${config.server.webflowSubdomain}.webflow.io`,
            Referer: `https://${config.server.webflowSubdomain}.webflow.io${req.headers.referer?.replace(/^https?:\/\/[^/]+/, "") || "/"}`,
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
      res.status(err.response?.status || 500).send(err.response?.data || "Auth error");
    }
  });
}
function startWebflowProxy(config, reloadEmitter) {
  const app = express();
  const wsInstance = expressWs(app);
  app.use(
    cors({
      credentials: true,
      origin: [/.*/]
    })
  );
  app.use(cookieParser());
  app.use(routes.app, express.static(process.cwd()));
  app.use(
    routes.devflow,
    express.static(path.resolve(import.meta.dirname, ".."))
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  if (config.server.livereload) {
    wsInstance.app.ws(routes.livereload, () => {
      logger.info("Auto Reload connection established");
    });
  }
  reloadEmitter.on("script-change", () => {
    wsInstance.getWss().clients.forEach(
      (client) => config.server.livereload && client.send("reload")
    );
  });
  reloadEmitter.on("styles-change", () => {
    wsInstance.getWss().clients.forEach(
      (client) => config.server.livereload && client.send("reload-css")
    );
  });
  routeWfAuth(app, config);
  app.get("*", async (req, res) => {
    const startPref = Date.now();
    let isPage = false;
    let scriptsRemovedLog = "";
    try {
      if (req.url.includes("devtools")) return;
      const _res = await axios.get(
        `https://${config.server.webflowSubdomain}.webflow.io${req.url}`,
        {
          headers: {
            Referer: `https://${config.server.webflowSubdomain}.webflow.io${req.path}`,
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
        const result = replaceAssets(dataHtml, config);
        scriptsRemovedLog = `Replaced ${result.removedCount} ${result.removedCount === 1 ? "asset" : "assets"}`;
        res.send(result.html);
      } else {
        res.send(_res.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        res.status(401).send(err.response.data);
      } else {
        logger.error("Page not found", req.path);
        res.send(
          `[${logger.scope}] Page not found ${req.path} | status : ${err.message}`
        );
      }
    } finally {
      const endPref = Date.now();
      if (isPage) {
        logger.info(
          `Page ${chalk.cyan(req.url)} took ${endPref - startPref}ms to fetch`
        );
      }
      if (scriptsRemovedLog) {
        logger.info(scriptsRemovedLog);
      }
    }
  });
  app.listen(config.server.port, () => {
    logger.info(`Local server http://localhost:${config.server.port}`);
  });
}
async function devflow() {
  const config = await parseConfigAction();
  const reloadEmitter = new events.EventEmitter();
  logger.setScope("Dev");
  logger.info("Read the docs at https://github.com/peakpointch/peakflow-cli");
  await buildApp(config);
  startWebflowProxy(config, reloadEmitter);
  reloadEmitter.emit("script-change", config.build.modules);
  const watcher = chokidar.watch(config.server.watchList, {
    ignoreInitial: true
  });
  watcher.on("all", async (_, filePath) => {
    if (/\.(js|ts)$/.test(filePath)) {
      logger.info("File change detected, rebuilding...");
      await buildApp(config);
      reloadEmitter.emit("script-change", config.build.modules);
    } else if (/\.(css)$/.test(filePath)) {
      logger.info("CSS change detected, reloading stylesheets...");
      reloadEmitter.emit("styles-change", config.build.modules);
    }
  });
}
export {
  devflow as default
};
