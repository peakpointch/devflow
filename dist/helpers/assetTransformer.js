"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssetUrls = updateAssetUrls;
exports.stringifyAssets = stringifyAssets;
const devflow_1 = require("../devflow");
function updateAssetUrls(assets, config) {
    return assets.map((asset) => {
        const isMatched = config.scriptList.includes(asset.filename);
        if (!isMatched)
            return asset;
        const newAttrs = Object.assign({}, asset.attrs);
        const localUrl = `${devflow_1.routes.dist}/${asset.filename}`;
        if (asset.type === "script") {
            newAttrs.src = localUrl;
        }
        else {
            newAttrs.href = localUrl;
            // Mark this for the hot-reload script to find
            newAttrs["data-devflow-css"] = "true";
        }
        return Object.assign(Object.assign({}, asset), { attrs: newAttrs });
    });
}
function stringifyAssets(assets) {
    return assets
        .map((asset) => {
        const attrString = Object.entries(asset.attrs)
            .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
            .join(" ");
        return asset.type === "script"
            ? `<script ${attrString}></script>`
            : `<link ${attrString}>`;
    })
        .join("\n");
}
