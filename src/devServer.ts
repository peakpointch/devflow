import { build } from "esbuild";
import chokidar from "chokidar";
import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";
import path from "path";
import events from "events";
import openurl from "openurl";
import parseConfig from "../dist/parseConfig.js";

const prefixX = "⚛️  xAtom  👉";

// -----------------------------
// Dev build with esbuild + chokidar
// -----------------------------
const loadEsbuildDev = async (
  src: string | string[],
  dist: string,
  reloadEmitter: events.EventEmitter,
  onInitCB: () => void,
): Promise<void> => {
  let init = false;

  const buildOnce = async (): Promise<void> => {
    try {
      await build({
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
    } catch (err: any) {
      console.error(prefixX, "Build failed:", err.message);
    }
  };

  // Initial build
  await buildOnce();

  // Watch for changes
  const watcher = chokidar.watch(src, { ignoreInitial: true });
  watcher.on("all", async () => {
    console.log(prefixX, "File change detected, rebuilding...");
    await buildOnce();
  });
};

// -----------------------------
// Proxy server
// -----------------------------
export const loadProxyServer = (
  webflowSubdomain: string,
  port: number,
  distPath: string,
  scriptList: string[],
  scriptToRemove: string | string[],
  reloadEmitter: events.EventEmitter,
) => {
  const app = express();
  const wsInstance = expressWs(app); // typed wrapper
  app.use(
    cors({
      credentials: true,
      origin: [/.*/],
    }),
  );
  app.use(cookieParser());
  app.use("/____xatom_js", express.static(path.resolve(distPath)));

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

  app.get("*", async (req, res) => {
    const startPref = Date.now();
    let isPage = false;
    try {
      const _res = await axios.get(
        `https://${webflowSubdomain}.webflow.io${req.url}`,
        {
          headers: {
            Referer: `https://${webflowSubdomain}.webflow.io${req.path}`,
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
        scriptToRemove = Array.isArray(scriptToRemove)
          ? scriptToRemove
          : [scriptToRemove];
        if (scriptToRemove.length) {
          dataHtml = dataHtml.replace(
            new RegExp(
              `<script\\b[^>]*(?:${scriptToRemove.join("|")}(?: {1}|="))\\b[^>]*>([\\s\\S]*?)<\\/script>`,
              "mg",
            ),
            (e) => {
              console.log(prefixX, "ÔÜá´©Å   Script Removed", e);
              return "";
            },
          );
        }
        res.send(dataHtml.replace("</body>", `${finalScriptPaths}</body>`));
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
      if (isPage)
        console.log(
          prefixX,
          "Page",
          req.url,
          `took ${endPref - startPref}ms to fetch`,
        );
    }
  });

  app.listen(port, () => {
    console.log(prefixX, `local server http://localhost:${port}`);
  });
};

// -----------------------------
// Load dev server
// -----------------------------
export const loadDevServer = (configFilePath: string) => {
  const config = parseConfig(configFilePath);
  const reloadEmitter = new events.EventEmitter();

  console.log(prefixX, "Read Documentation 📚: https://xatom.js.org/");

  loadEsbuildDev(config.source, config.dist, reloadEmitter, () => {
    loadProxyServer(
      config.webflowSubdomain,
      config.port,
      config.dist,
      config.scriptList,
      config.scriptAttribute,
      reloadEmitter,
    );
  });
};
