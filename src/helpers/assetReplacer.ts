import type { PeakflowConfig } from "peakflow/config";

import { assetDataset, styleSheetDataset, scriptDataset } from "./dataset.js";
import { type DevUrlOptions, getDevServerUrl } from "./devUrl.js";
import {
  type HtmlAttributes,
  insertBeforeClosingHtmlTag,
  patchHtmlAttributes,
  replaceHtmlOpeningTags,
  stringifyHtmlElement,
} from "./htmlRewriter.js";
import { routes } from "./routes.js";

function getLocalAssetPath(attributes: HtmlAttributes): string | undefined {
  const hmr = attributes[assetDataset.attr.hmr];
  const localPath = attributes[assetDataset.attr.local];

  return hmr === true && typeof localPath === "string" ? localPath : undefined;
}

export function getLocalAssetUrl(
  localPath: string,
  config: PeakflowConfig,
  options?: DevUrlOptions,
): string {
  const cleanPath = `/${routes.app}/${localPath}`.replace(/\/+/g, "/");
  return getDevServerUrl(config, cleanPath, options);
}

function replaceLocalScripts(
  html: string,
  config: PeakflowConfig,
  options?: DevUrlOptions,
) {
  return replaceHtmlOpeningTags(html, "script", (script) => {
    const localPath = getLocalAssetPath(script.attributes);

    if (!localPath) return script.openingTag;

    return patchHtmlAttributes(script.openingTag, {
      [scriptDataset.attr.src]: getLocalAssetUrl(localPath, config, options),
      [scriptDataset.attr.integrity]: false, // Delete's the integrity attribute
    });
  });
}

function replaceLocalStylesheets(
  html: string,
  config: PeakflowConfig,
  options?: DevUrlOptions,
) {
  return replaceHtmlOpeningTags(html, "link", (link) => {
    const localPath = getLocalAssetPath(link.attributes);
    const isStyleSheet =
      typeof link.attributes.rel === "string" &&
      link.attributes.rel.toLowerCase() === "stylesheet";

    if (!isStyleSheet || !localPath) {
      return link.openingTag;
    }

    return patchHtmlAttributes(link.openingTag, {
      [styleSheetDataset.attr.href]: getLocalAssetUrl(
        localPath,
        config,
        options,
      ),
      [styleSheetDataset.attr.integrity]: false, // Delete's the integrity attribute
    });
  });
}

/**
 * This script enables livereload in the browser.
 */
function getReloadScript(): string {
  return stringifyHtmlElement({
    tagName: "script",
    attributes: {
      src: routes.server + "/src/extension/dist/client.js",
      defer: true,
    },
    innerHtml: "",
  });
}

function injectReloadScript(html: string, config: PeakflowConfig) {
  const reloadScript = getReloadScript();
  const shouldInject = config.devServer.livereload === true;

  const newHtml = shouldInject
    ? insertBeforeClosingHtmlTag(html, "body", `${reloadScript}\n`)
    : html;

  return { html: newHtml, didInject: shouldInject };
}

export function replaceAssets(
  html: string,
  config: PeakflowConfig,
  options?: DevUrlOptions,
) {
  const scriptResult = replaceLocalScripts(html, config, options);
  const stylesResult = replaceLocalStylesheets(
    scriptResult.html,
    config,
    options,
  );
  const reloadResult = injectReloadScript(stylesResult.html, config);

  return {
    html: reloadResult.html,
    replacedCount: scriptResult.replacedCount + stylesResult.replacedCount,
  };
}
