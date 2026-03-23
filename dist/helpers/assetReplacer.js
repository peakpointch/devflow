"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAttributes = parseAttributes;
exports.replaceAssets = replaceAssets;
const assetParser_1 = require("./assetParser");
const assetTransformer_1 = require("./assetTransformer");
const livereload_1 = require("./livereload");
/**
 * Generic parser for HTML attributes
 */
function parseAttributes(attrString) {
    const attrs = {};
    attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
        attrs[name] = value !== null && value !== void 0 ? value : true;
        return "";
    });
    return attrs;
}
function replaceAssets(html, config) {
    const configAttrs = Array.isArray(config.scriptAttribute)
        ? config.scriptAttribute
        : [config.scriptAttribute].filter(Boolean);
    if (!configAttrs.length)
        return { html, removedCount: 0 };
    const extracted = (0, assetParser_1.extractAssets)(html, configAttrs);
    // Remove all original tags (scripts and links)
    let cleanedHtml = html;
    for (const asset of extracted) {
        const escaped = asset.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        cleanedHtml = cleanedHtml.replace(new RegExp(escaped, "g"), "");
    }
    const updated = (0, assetTransformer_1.updateAssetUrls)(extracted, config);
    const newTags = (0, assetTransformer_1.stringifyAssets)(updated);
    // Inject before closing body
    const finalHtml = cleanedHtml.replace("</body>", `${newTags}\n${(0, livereload_1.getReloadScript)(config)}</body>`);
    return { html: finalHtml, removedCount: extracted.length };
}
