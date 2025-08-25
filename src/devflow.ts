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

// -----------------------------
// Build app with esbuild
// -----------------------------
async function buildApp(config: DevflowConfig): Promise<void> {
  try {
    await build({
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
    });

    console.log(prefixX, "Build done");
  } catch (err: any) {
    console.error(prefixX, "Build failed:", err.message);
  }
}

// -----------------------------
// Proxy server
// -----------------------------
function startWebflowProxy(
  config: DevflowConfig,
  reloadEmitter: events.EventEmitter,
) {
  const routes = {
    livereload: "/__livereload",
    dist: "/__dist",
  };

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

  wsInstance.app.ws(routes.livereload, () => {
    console.log(prefixX, "Auto Reload connection established");
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
    config.scriptList.map(
      (script) => `<script src="${routes.dist}/${script}"></script>`,
    ),
  ]
    .flat()
    .join("");

  let scriptsRemovedLog = "";

  app.get("*", async (req, res) => {
    const startPref = Date.now();
    let isPage = false;
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
        config.scriptAttribute = Array.isArray(config.scriptAttribute)
          ? config.scriptAttribute
          : [config.scriptAttribute];
        if (config.scriptAttribute.length) {
          dataHtml = dataHtml.replace(
            new RegExp(
              `<script\\b[^>]*(?:${config.scriptAttribute.join("|")}(?: {1}|="))\\b[^>]*>([\\s\\S]*?)<\\/script>`,
              "mg",
            ),
          );
        }
        scriptsRemovedLog = `Scripts removed ${config.scriptAttribute.length}/${config.scriptAttribute.length}`;
        res.send(dataHtml.replace("</body>", `${scriptTags}</body>`));
      } else {
        res.send(_res.data);
      }
    } catch (err: any) {
      console.log(prefixX, "Page not found", req.path);
      res.send(
        `${prefixX} page not found ${req.path} | status : ${err.message}`,
      );
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
        scriptsRemovedLog = "";
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
  const watcher = chokidar.watch(["src/"], {
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
