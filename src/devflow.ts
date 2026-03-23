import { build } from "esbuild";
import chokidar from "chokidar";
import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";
import path from "path";
import events from "events";
import parseConfig, { DevflowConfig } from "./parse-config";
import chalk from "chalk";
import { prefixX } from "./cli";
import stripAnsi from "strip-ansi";
import { replaceAssets } from "./helpers/assetReplacer";

/**
 * Custom routes that are not mirrored from devflow.
 */
export const routes = {
  /**
   *
   */
  livereload: "/__livereload",
  /**
   * Host local files
   */
  dist: "/__dist",
};

// -----------------------------
// Build app with esbuild
// -----------------------------
async function buildApp(config: DevflowConfig): Promise<void> {
  try {
    await build({
      entryPoints: config.source,
      bundle: true,
      outdir: `${config.dist}`,
      sourcemap: true,
      minify: false,
      format: "iife",
      target: ["es2020"],
      platform: "browser",
      external: ["@vime/core"],
    });

    console.log(prefixX, "Build done");
  } catch (err: any) {
    console.error(prefixX, "Build failed:", err.message);
  }
}

function routeWfAuth(
  app: ReturnType<typeof express>,
  config: DevflowConfig,
): void {
  app.post("/.wf_auth", async (req, res) => {
    try {
      const body = new URLSearchParams(req.body).toString();

      const _res = await axios.post(
        `https://${config.webflowSubdomain}.webflow.io/.wf_auth`,
        body,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": req.headers["user-agent"] || "",
            Cookie: req.headers.cookie || "",
            Origin: `https://${config.webflowSubdomain}.webflow.io`,
            Referer: `https://${config.webflowSubdomain}.webflow.io${req.headers.referer?.replace(/^https?:\/\/[^/]+/, "") || "/"}`,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language":
              req.headers["accept-language"] || "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          maxRedirects: 0, // don't auto-follow
          validateStatus: () => true, // let us handle 302/401/etc.
          withCredentials: true,
        },
      );

      // Forward cookies
      if (_res.headers["set-cookie"]) {
        res.setHeader("set-cookie", _res.headers["set-cookie"]);
      }

      // Forward redirect if present
      if (_res.status >= 300 && _res.status < 400 && _res.headers.location) {
        return res.redirect(_res.status, _res.headers.location);
      }

      res.status(_res.status).send(_res.data);
    } catch (err: any) {
      console.error("Error proxying /.wf_auth", err.message);
      res
        .status(err.response?.status || 500)
        .send(err.response?.data || "Auth error");
    }
  });
}

// -----------------------------
// Proxy server
// -----------------------------
function startWebflowProxy(
  config: DevflowConfig,
  reloadEmitter: events.EventEmitter,
) {
  const app = express();
  const wsInstance = expressWs(app); // typed wrapper
  app.use(
    cors({
      credentials: true,
      origin: [/.*/],
    }),
  );
  app.use(cookieParser());
  app.use(routes.dist, express.static(path.resolve(config.dist)));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  if (config.livereload) {
    wsInstance.app.ws(routes.livereload, () => {
      console.log(prefixX, "Auto Reload connection established");
    });
  }

  reloadEmitter.on("script-change", () => {
    wsInstance
      .getWss()
      .clients.forEach((client) => config.livereload && client.send("reload"));
  });

  reloadEmitter.on("styles-change", () => {
    wsInstance
      .getWss()
      .clients.forEach(
        (client) => config.livereload && client.send("reload-css"),
      );
  });

  routeWfAuth(app, config);

  app.get("*", async (req, res) => {
    const startPref = Date.now();
    let isPage = false;
    let scriptsRemovedLog = "";
    try {
      // Skip devtools
      if (req.url.includes("devtools")) return;

      const _res = await axios.get(
        `https://${config.webflowSubdomain}.webflow.io${req.url}`,
        {
          headers: {
            Referer: `https://${config.webflowSubdomain}.webflow.io${req.path}`,
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "User-Agent": req.headers["user-agent"] || "",
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9,it;q=0.8",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "upgrade-insecure-requests": "1",
            Cookie: req.headers.cookie || "",
          },
          withCredentials: true,
        },
      );

      const type = _res.headers["content-type"] || _res.headers["Content-Type"];
      let dataHtml = _res.data;

      if (type && type.includes("text/html")) {
        isPage = true;

        const result = replaceAssets(dataHtml, config);

        scriptsRemovedLog = `Scripts removed ${result.removedCount}/${config.scriptAttribute.length}`;
        res.send(result.html);
      } else {
        res.send(_res.data);
      }
    } catch (err: any) {
      // TODO: If the status code is 401, display webflow's password protected login page that was shipped with that code.
      if (err.response && err.response.status === 401) {
        res.status(401).send(err.response.data);
      } else {
        console.log(prefixX, "Page not found", req.path);
        res.send(
          `${stripAnsi(prefixX)} page not found ${req.path} | status : ${err.message}`,
        );
      }
    } finally {
      const endPref = Date.now();
      if (isPage) {
        console.log(
          prefixX,
          "Page",
          chalk.cyan(req.url),
          `took ${endPref - startPref}ms to fetch`,
        );
      }
      if (scriptsRemovedLog) {
        console.log(prefixX, scriptsRemovedLog);
      }
    }
  });

  app.listen(config.port, () => {
    console.log(prefixX, `local server http://localhost:${config.port}`);
  });
}

// -----------------------------
// Start Devflow
// -----------------------------
export default async function devflow(configFilePath: string) {
  const config = parseConfig(configFilePath);
  const reloadEmitter = new events.EventEmitter();

  console.log(prefixX, "Read Documentation 📚: https://xatom.js.org/");

  // Initial build
  await buildApp(config);

  // Start webflow proxy server, mirroring the .webflow.io staging domain
  startWebflowProxy(config, reloadEmitter);
  reloadEmitter.emit("script-change", config.source);

  // Watch for changes
  const watcher = chokidar.watch(config.watchList, {
    ignoreInitial: true,
  });
  watcher.on("all", async (_, filePath) => {
    if (/\.(js|ts)$/.test(filePath)) {
      console.log(prefixX, "File change detected, rebuilding...");
      await buildApp(config);
      reloadEmitter.emit("script-change", config.source);
    } else if (/\.(css)$/.test(filePath)) {
      console.log(prefixX, "CSS change detected, reloading stylesheets...");
      reloadEmitter.emit("styles-change", config.source);
    }
  });
}
