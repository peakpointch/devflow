import { assetDataset, styleSheetDataset, scriptDataset } from "./dataset.js";
import {
  insertBeforeClosingHtmlTag,
  patchHtmlAttributes,
  replaceHtmlOpeningTags,
  stringifyHtmlElement
} from "./htmlRewriter.js";
import { routes } from "./routes.js";
function getLocalAssetPath(attributes) {
  const hmr = attributes[assetDataset.attr.hmr];
  const localPath = attributes[assetDataset.attr.local];
  return hmr === true && typeof localPath === "string" ? localPath : void 0;
}
function getLocalAssetUrl(localPath, config) {
  const origin = `http://localhost:${config.devServer.port}`;
  const cleanPath = `/${routes.app}/${localPath}`.replace(/\/+/g, "/");
  return `${origin}${cleanPath}`;
}
function replaceLocalScripts(html, config) {
  return replaceHtmlOpeningTags(html, "script", (script) => {
    const localPath = getLocalAssetPath(script.attributes);
    if (!localPath) return script.openingTag;
    return patchHtmlAttributes(script.openingTag, {
      [scriptDataset.attr.src]: getLocalAssetUrl(localPath, config),
      [scriptDataset.attr.integrity]: false
      // Delete's the integrity attribute
    });
  });
}
function replaceLocalStylesheets(html, config) {
  return replaceHtmlOpeningTags(html, "link", (link) => {
    const localPath = getLocalAssetPath(link.attributes);
    const isStyleSheet = typeof link.attributes.rel === "string" && link.attributes.rel.toLowerCase() === "stylesheet";
    if (!isStyleSheet || !localPath) {
      return link.openingTag;
    }
    return patchHtmlAttributes(link.openingTag, {
      [styleSheetDataset.attr.href]: getLocalAssetUrl(localPath, config),
      [styleSheetDataset.attr.integrity]: false
      // Delete's the integrity attribute
    });
  });
}
function getReloadScript() {
  return stringifyHtmlElement({
    tagName: "script",
    attributes: {
      src: routes.server + "/src/extension/dist/client.js",
      defer: true
    },
    innerHtml: ""
  });
}
function injectReloadScript(html, config) {
  const reloadScript = getReloadScript();
  const shouldInject = config.devServer.livereload === true;
  const newHtml = shouldInject ? insertBeforeClosingHtmlTag(html, "body", `${reloadScript}
`) : html;
  return { html: newHtml, didInject: shouldInject };
}
function replaceAssets(html, config) {
  const scriptResult = replaceLocalScripts(html, config);
  const stylesResult = replaceLocalStylesheets(scriptResult.html, config);
  const reloadResult = injectReloadScript(stylesResult.html, config);
  return {
    html: reloadResult.html,
    replacedCount: scriptResult.replacedCount + stylesResult.replacedCount
  };
}
export {
  getLocalAssetUrl,
  replaceAssets
};
