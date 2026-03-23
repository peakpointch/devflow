"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAttributes = parseAttributes;
exports.parseLocalPathFromcdn = parseLocalPathFromcdn;
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
 * Extracts the local repository path from a JSDelivr URL (GitHub or NPM).
 * Falls back to stripping the domain if no CDN pattern matches.
 */
function parseLocalPathFromcdn(source) {
    // Pattern 1: GitHub (@version/path or gh/user/repo/path)
    // Pattern 2: NPM (npm/package@version/path)
    const jsDelivrRegex = /(?:@[\d.]+|npm\/[^@/]+@[\d.]+)\/(.*)$|gh\/[^/]+\/[^/]+\/(.*)$/;
    const match = source.match(jsDelivrRegex);
    // Extract the raw path (e.g., "dist/app.js" or "src/styles/main.css")
    const fullInternalPath = match
        ? match[1] || match[2]
        : source.replace(/^https?:\/\/[^/]+\//, ""); // Fallback: remove domain only
    const pathParts = fullInternalPath.split("/");
    const fileName = pathParts.pop() || "";
    const filePath = pathParts.join("/");
    return {
        filePath,
        fileName,
    };
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
                const { fileName, filePath } = parseLocalPathFromcdn(source);
                assets.push({
                    tag: match[0],
                    attrs,
                    fileName,
                    filePath,
                    type,
                });
            }
        }
    }
    return assets;
}
