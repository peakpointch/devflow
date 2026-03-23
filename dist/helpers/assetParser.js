"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAttributes = parseAttributes;
exports.extractAssets = extractAssets;
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
/**
 * Extracts specific tags (script or link) that match the provided user attributes
 */
function extractAssets(html, configAttrs) {
    const assets = [];
    // Regex for both <script src="..."> and <link rel="stylesheet" href="...">
    const patterns = [
        {
            regex: /<script\b([^>]*)>([\s\S]*?)<\/script>/gim,
            type: "script",
            srcAttr: "src",
        },
        {
            regex: /<link\b([^>]*?rel="stylesheet"[^>]*?)>/gim,
            type: "stylesheet",
            srcAttr: "href",
        },
    ];
    for (const { regex, type, srcAttr } of patterns) {
        let match;
        while ((match = regex.exec(html))) {
            const attrs = parseAttributes(match[1]);
            if (configAttrs.some((attr) => attr in attrs)) {
                const source = attrs[srcAttr];
                assets.push({
                    tag: match[0],
                    attrs,
                    filename: source ? source.split("/").pop() || "" : "",
                    type,
                });
            }
        }
    }
    return assets;
}
