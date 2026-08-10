import axios from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import path from "path";
import { replaceAssets } from "./helpers/assetReplacer.js";
import { routes } from "./helpers/routes.js";
import { devLogger as logger } from "./helpers/taskLogger.js";
import { serverLogger } from "./helpers/httpLogger.js";
import { errorToString, pluralize } from "./helpers/utils.js";
function getWebflowBaseUrl(subdomain) {
  return `https://${subdomain}.webflow.io`;
}
function getContentType(headers) {
  return headers["content-type"]?.toString() || "";
}
function forwardHeaders(headers, proxyRes) {
  const forward = ["content-type", "set-cookie"];
  for (const key of forward) {
    if (headers[key]) {
      proxyRes.setHeader(key, headers[key]);
    }
  }
}
function getRequestHeaders(baseUrl, proxyReq) {
  return {
    Accept: proxyReq.headers.accept || "*/*",
    "Accept-Language": proxyReq.headers["accept-language"] || "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Cookie: proxyReq.headers.cookie || "",
    Pragma: "no-cache",
    Referer: `${baseUrl}${proxyReq.headers.referer?.replace(/^https?:\/\/[^/]+/, "") || "/"}`,
    "User-Agent": proxyReq.headers["user-agent"] || ""
  };
}
async function requestWebflowGET(config, proxyReq) {
  const baseUrl = getWebflowBaseUrl(config.server.webflowSubdomain);
  return await axios.get(`${baseUrl}${proxyReq.url}`, {
    headers: {
      ...getRequestHeaders(baseUrl, proxyReq),
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Upgrade-Insecure-Requests": "1"
    },
    withCredentials: true,
    validateStatus: () => true,
    responseType: "arraybuffer"
  });
}
function routeGetRequests(app, config) {
  app.get("*", async (proxyReq, proxyRes) => {
    const performanceStart = performance.now();
    let assetMessage = "";
    try {
      if (proxyReq.url.includes("devtools")) {
        proxyRes.sendStatus(204);
        return;
      }
      const webflowRes = await requestWebflowGET(config, proxyReq);
      forwardHeaders(webflowRes.headers, proxyRes);
      proxyRes.status(webflowRes.status);
      const contentType = getContentType(webflowRes.headers);
      const responseIsHtml = contentType.includes("text/html");
      if (responseIsHtml) {
        const html = Buffer.from(webflowRes.data).toString("utf8");
        const result = replaceAssets(html, config);
        assetMessage = `Replaced ${logger.num(result.removedCount)} ${pluralize(
          "asset",
          result.removedCount
        )}`;
        proxyRes.send(result.html);
      } else {
        proxyRes.send(Buffer.from(webflowRes.data));
      }
    } catch (err) {
      proxyRes.status(502).send(
        `Failed to proxy ${proxyReq.method} ${proxyReq.path}: ${errorToString(err)}
${err?.response?.data}`
      );
    } finally {
      const duration = performance.now() - performanceStart;
      serverLogger.request({
        method: proxyReq.method,
        path: proxyReq.url,
        status: proxyRes.statusCode,
        duration
      });
      if (assetMessage) {
        logger.info(assetMessage);
      }
    }
  });
}
async function requestWebflowAuthPOST(config, proxyReq) {
  const body = new URLSearchParams(proxyReq.body).toString();
  const baseUrl = getWebflowBaseUrl(config.server.webflowSubdomain);
  return await axios.post(`${baseUrl}${proxyReq.url}`, body, {
    headers: {
      ...getRequestHeaders(baseUrl, proxyReq),
      Origin: baseUrl,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    maxRedirects: 0,
    // do not auto-follow
    validateStatus: () => true,
    withCredentials: true
  });
}
function routeWebflowAuthRequests(app, config) {
  app.post(routes.wfAuth, async (proxyReq, proxyRes) => {
    const performanceStart = performance.now();
    try {
      const webflowRes = await requestWebflowAuthPOST(config, proxyReq);
      forwardHeaders(webflowRes.headers, proxyRes);
      proxyRes.status(webflowRes.status);
      if (webflowRes.status >= 300 && webflowRes.status < 400 && webflowRes.headers.location) {
        return proxyRes.redirect(
          webflowRes.status,
          webflowRes.headers.location
        );
      }
      proxyRes.send(webflowRes.data);
    } catch (err) {
      proxyRes.status(502).send(
        `Failed to proxy ${proxyReq.method} ${proxyReq.path}: ${errorToString(err)}
${err?.response?.data}`
      );
    } finally {
      const duration = performance.now() - performanceStart;
      serverLogger.request({
        method: proxyReq.method,
        path: proxyReq.url,
        status: proxyRes.statusCode,
        duration
      });
    }
  });
}
function setupLivereload(app, reloadEmitter, config) {
  const wsInstance = expressWs(app);
  if (config.server.livereload) {
    wsInstance.app.ws(routes.livereload, () => {
      serverLogger.connection({
        protocol: "WS",
        path: routes.livereload,
        state: "connected"
      });
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
}
function startWebflowProxy(config, reloadEmitter) {
  const app = express();
  app.use(
    cors({
      credentials: true,
      origin: [/.*/]
    })
  );
  app.use(cookieParser());
  app.use(routes.app, express.static(process.cwd()));
  app.use(
    routes.server,
    express.static(path.resolve(import.meta.dirname, ".."))
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  setupLivereload(app, reloadEmitter, config);
  routeGetRequests(app, config);
  routeWebflowAuthRequests(app, config);
  app.listen(config.server.port, () => {
    logger.success(`Local server http://localhost:${config.server.port}`);
  });
}
export {
  getWebflowBaseUrl,
  startWebflowProxy
};
