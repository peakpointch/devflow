import axios from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import fs from "fs/promises";
import path from "path";
import {
  loadLocalCodeComponentLibrary
} from "./helpers/codeComponentBridge.js";
import { addCssImportCacheBuster } from "./helpers/cssPipeline.js";
import { htmlPipeline } from "./helpers/htmlPipeline.js";
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
async function serveCacheBustedCss(request, response, next) {
  const timestamp = request.query["peakflow-t"];
  if (!request.path.endsWith(".css") || typeof timestamp !== "string") {
    next();
    return;
  }
  const root = process.cwd();
  const filePath = path.resolve(root, `.${request.path}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    next();
    return;
  }
  try {
    const css = await fs.readFile(filePath, "utf8");
    response.setHeader("Cache-Control", "no-store");
    response.type("css").send(addCssImportCacheBuster(css, timestamp));
  } catch (error) {
    if (error.code === "ENOENT") {
      next();
      return;
    }
    next(error);
  }
}
async function requestWebflowGET(config, proxyReq) {
  const baseUrl = getWebflowBaseUrl(config.devServer.webflowSubdomain);
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
function routeGetRequests(app, config, localCodeComponents, componentModuleId, devUrlOptions) {
  app.get(/.*/, async (proxyReq, proxyRes) => {
    const performanceStart = performance.now();
    let assetMessage = "";
    let componentMessage = "";
    let componentDiagnosticMessage = "";
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
        const pipelineResult = htmlPipeline(html, {
          componentModuleId,
          config,
          includeComponentDiagnostics: !proxyReq.path.endsWith(".map"),
          localCodeComponents,
          ...devUrlOptions
        });
        assetMessage = pipelineResult.assetMessage;
        componentMessage = pipelineResult.componentMessage;
        componentDiagnosticMessage = pipelineResult.componentDiagnosticMessage;
        proxyRes.send(pipelineResult.html);
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
      if (componentMessage) {
        logger.info(componentMessage);
      }
      if (componentDiagnosticMessage) {
        logger.debug(componentDiagnosticMessage);
      }
    }
  });
}
async function requestWebflowAuthPOST(config, proxyReq) {
  const body = new URLSearchParams(proxyReq.body).toString();
  const baseUrl = getWebflowBaseUrl(config.devServer.webflowSubdomain);
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
  if (config.devServer.livereload) {
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
      (client) => config.devServer.livereload && client.send("reload")
    );
  });
  reloadEmitter.on("styles-change", () => {
    wsInstance.getWss().clients.forEach(
      (client) => config.devServer.livereload && client.send("reload-css")
    );
  });
}
function startWebflowProxy(config, reloadEmitter, {
  componentModuleId,
  devUrlMode = { type: "localhost" }
} = {}) {
  const app = express();
  let localCodeComponents;
  try {
    localCodeComponents = loadLocalCodeComponentLibrary(config, {
      devUrlMode
    });
  } catch (err) {
    logger.warn("Failed to load local Code Component library:", err);
  }
  app.use(
    cors({
      credentials: true,
      origin: [/.*/]
    })
  );
  app.use(cookieParser());
  app.use(routes.app, serveCacheBustedCss);
  app.use(
    routes.app,
    express.static(process.cwd(), {
      etag: false,
      lastModified: false,
      setHeaders: (response) => {
        response.setHeader("Cache-Control", "no-store");
      }
    })
  );
  app.use(
    routes.server,
    express.static(path.resolve(import.meta.dirname, ".."))
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  setupLivereload(app, reloadEmitter, config);
  routeGetRequests(app, config, localCodeComponents, componentModuleId, {
    devUrlMode
  });
  routeWebflowAuthRequests(app, config);
  app.listen(config.devServer.port, () => {
    if (localCodeComponents) {
      logger.success(
        "Local Code Component library",
        logger.var(localCodeComponents.moduleId),
        "with",
        logger.num(localCodeComponents.componentIds.size),
        pluralize("component", localCodeComponents.componentIds.size)
      );
    }
    logger.success(`Local server http://localhost:${config.devServer.port}`);
  });
}
export {
  getWebflowBaseUrl,
  startWebflowProxy
};
