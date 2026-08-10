import axios, { AxiosHeaders } from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import events from "events";
import express from "express";
import expressWs from "express-ws";
import path from "path";

import { replaceAssets } from "./helpers/assetReplacer.js";
import { routes } from "./helpers/routes.js";
import { PeakflowConfig } from "peakflow/config";
import { devLogger as logger } from "./helpers/taskLogger.js";
import { serverLogger } from "./helpers/httpLogger.js";
import { errorToString, pluralize } from "./helpers/utils.js";

/**
 * Constructs the base URL of the Webflow site being proxied
 */
export function getWebflowBaseUrl(subdomain: string): string {
  return `https://${subdomain}.webflow.io`;
}

/**
 * Get the "Content-Type" headers
 */
function getContentType(headers: Partial<AxiosHeaders>): string {
  return headers["content-type"]?.toString() || "";
}

/**
 * Forwards specific response headers to the proxy response
 */
function forwardHeaders(
  headers: Partial<AxiosHeaders>,
  proxyRes: express.Response,
): void {
  const forward = ["content-type", "set-cookie"];

  for (const key of forward) {
    if (headers[key]) {
      proxyRes.setHeader(key, headers[key]);
    }
  }
}

/**
 * Get common request headers for the proxy
 */
function getRequestHeaders(baseUrl: string, proxyReq: express.Request) {
  return {
    Accept: proxyReq.headers.accept || "*/*",
    "Accept-Language": proxyReq.headers["accept-language"] || "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Cookie: proxyReq.headers.cookie || "",
    Pragma: "no-cache",
    Referer: `${baseUrl}${proxyReq.headers.referer?.replace(/^https?:\/\/[^/]+/, "") || "/"}`,
    "User-Agent": proxyReq.headers["user-agent"] || "",
  };
}

/**
 * Forwards all GET requests to the Webflow site
 */
async function requestWebflowGET(
  config: PeakflowConfig,
  proxyReq: express.Request,
) {
  const baseUrl = getWebflowBaseUrl(config.server.webflowSubdomain);
  return await axios.get(`${baseUrl}${proxyReq.url}`, {
    headers: {
      ...getRequestHeaders(baseUrl, proxyReq),

      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Upgrade-Insecure-Requests": "1",
    },
    withCredentials: true,
    validateStatus: () => true,
    responseType: "arraybuffer",
  });
}

/**
 * Routes all GET requests
 */
function routeGetRequests(app: express.Express, config: PeakflowConfig): void {
  app.get("*", async (proxyReq, proxyRes) => {
    const performanceStart = performance.now();
    let assetMessage = "";
    try {
      // Skip devtools
      if (proxyReq.url.includes("devtools")) {
        proxyRes.sendStatus(204);
        return;
      }

      // Forward the request to the Webflow site
      const webflowRes = await requestWebflowGET(config, proxyReq);

      // Forward headers and status code
      forwardHeaders(webflowRes.headers, proxyRes);
      proxyRes.status(webflowRes.status);

      // Determine content type
      const contentType = getContentType(webflowRes.headers);
      const responseIsHtml = contentType.includes("text/html");

      // Replace assets if applicable
      if (responseIsHtml) {
        const html = Buffer.from(webflowRes.data).toString("utf8");
        const result = replaceAssets(html, config);

        assetMessage = `Replaced ${logger.num(result.removedCount)} ${pluralize(
          "asset",
          result.removedCount,
        )}`;

        proxyRes.send(result.html);
      } else {
        proxyRes.send(Buffer.from(webflowRes.data));
      }
    } catch (err: any) {
      proxyRes
        .status(502)
        .send(
          `Failed to proxy ${proxyReq.method} ${proxyReq.path}: ${errorToString(err)}\n${err?.response?.data}`,
        );
    } finally {
      const duration = performance.now() - performanceStart;

      serverLogger.request({
        method: proxyReq.method as "GET",
        path: proxyReq.url,
        status: proxyRes.statusCode,
        duration,
      });

      if (assetMessage) {
        logger.info(assetMessage);
      }
    }
  });
}

/**
 * Forwards the auth request to the Webflow site
 */
async function requestWebflowAuthPOST(
  config: PeakflowConfig,
  proxyReq: express.Request,
) {
  const body = new URLSearchParams(proxyReq.body).toString();
  const baseUrl = getWebflowBaseUrl(config.server.webflowSubdomain);

  return await axios.post(`${baseUrl}${proxyReq.url}`, body, {
    headers: {
      ...getRequestHeaders(baseUrl, proxyReq),

      Origin: baseUrl,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0, // do not auto-follow
    validateStatus: () => true,
    withCredentials: true,
  });
}

/**
 * Routes Webflow's POST auth request for password protected pages
 */
function routeWebflowAuthRequests(
  app: ReturnType<typeof express>,
  config: PeakflowConfig,
): void {
  app.post(routes.wfAuth, async (proxyReq, proxyRes) => {
    const performanceStart = performance.now();
    try {
      const webflowRes = await requestWebflowAuthPOST(config, proxyReq);

      // Forward headers and status
      forwardHeaders(webflowRes.headers, proxyRes);
      proxyRes.status(webflowRes.status);

      // Forward redirect if present
      if (
        webflowRes.status >= 300 &&
        webflowRes.status < 400 &&
        webflowRes.headers.location
      ) {
        return proxyRes.redirect(
          webflowRes.status,
          webflowRes.headers.location,
        );
      }

      proxyRes.send(webflowRes.data);
    } catch (err: any) {
      proxyRes
        .status(502)
        .send(
          `Failed to proxy ${proxyReq.method} ${proxyReq.path}: ${errorToString(err)}\n${err?.response?.data}`,
        );
    } finally {
      const duration = performance.now() - performanceStart;

      serverLogger.request({
        method: proxyReq.method as "POST",
        path: proxyReq.url,
        status: proxyRes.statusCode,
        duration,
      });
    }
  });
}

/**
 * Start the livereload WebSocket and hook into livereload events
 */
function setupLivereload(
  app: express.Express,
  reloadEmitter: events.EventEmitter,
  config: PeakflowConfig,
): void {
  const wsInstance = expressWs(app); // typed wrapper

  if (config.server.livereload) {
    wsInstance.app.ws(routes.livereload, () => {
      serverLogger.connection({
        protocol: "WS",
        path: routes.livereload,
        state: "connected",
      });
    });
  }

  reloadEmitter.on("script-change", () => {
    wsInstance
      .getWss()
      .clients.forEach(
        (client) => config.server.livereload && client.send("reload"),
      );
  });

  reloadEmitter.on("styles-change", () => {
    wsInstance
      .getWss()
      .clients.forEach(
        (client) => config.server.livereload && client.send("reload-css"),
      );
  });
}

/**
 * Start the Webflow proxy server for local development
 */
export function startWebflowProxy(
  config: PeakflowConfig,
  reloadEmitter: events.EventEmitter,
): void {
  const app = express();

  app.use(
    cors({
      credentials: true,
      origin: [/.*/],
    }),
  );

  app.use(cookieParser());
  app.use(routes.app, express.static(process.cwd()));
  app.use(
    routes.server,
    express.static(path.resolve(import.meta.dirname, "..")),
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
