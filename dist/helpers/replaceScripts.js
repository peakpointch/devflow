"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processHTML = processHTML;
exports.getReloadScript = getReloadScript;
const devflow_1 = require("../devflow");
function extractScriptsByAttributes(html, scriptAttributes) {
    const regex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gim;
    const extracted = [];
    let match;
    while ((match = regex.exec(html))) {
        const attrString = match[1];
        const attrs = {};
        // Parse all attributes
        attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
            attrs[name] = value !== null && value !== void 0 ? value : true;
            return "";
        });
        // Check if this script has any of the configured attributes
        if (scriptAttributes.some((attr) => attr in attrs)) {
            const src = attrs.src;
            const filename = src ? src.split("/").pop() || "" : "";
            extracted.push({
                tag: match[0],
                attrs,
                filename,
            });
        }
    }
    return extracted;
}
function removeScriptsFromHTML(html, scripts) {
    let cleanedHtml = html;
    for (const script of scripts) {
        // Escape for regex
        const escapedTag = script.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        cleanedHtml = cleanedHtml.replace(new RegExp(escapedTag, "g"), "");
    }
    return cleanedHtml;
}
function updateScriptSrc(scripts, config) {
    return scripts.map((script) => {
        const matched = config.scriptList.find((s) => s === script.filename);
        if (matched) {
            return Object.assign(Object.assign({}, script), { attrs: Object.assign(Object.assign({}, script.attrs), { src: `${devflow_1.routes.dist}/${matched}` }) });
        }
        return script;
    });
}
function buildScriptTags(scripts) {
    return scripts
        .map((script) => {
        const attrString = Object.entries(script.attrs)
            .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
            .join(" ");
        return `<script ${attrString}></script>`;
    })
        .join("\n");
}
function processHTML(html, config) {
    const scriptAttrs = Array.isArray(config.scriptAttribute)
        ? config.scriptAttribute
        : config.scriptAttribute
            ? [config.scriptAttribute]
            : [];
    if (!scriptAttrs.length) {
        return { html, removedCount: 0 };
    }
    // 1. Extract
    const extractedScripts = extractScriptsByAttributes(html, scriptAttrs);
    // 2. Remove from HTML
    let cleanedHtml = removeScriptsFromHTML(html, extractedScripts);
    // 3. Update src
    const updatedScripts = updateScriptSrc(extractedScripts, config);
    // 4. Inject reload + updated scripts before </body>
    cleanedHtml = cleanedHtml.replace("</body>", `${getReloadScript(config)}\n${buildScriptTags(updatedScripts)}</body>`);
    return {
        html: cleanedHtml,
        removedCount: extractedScripts.length,
    };
}
function getReloadScript(config) {
    return config.livereload
        ? `<script>
  if ("WebSocket" in window) {
    (function () {
      const devflowLivereloadURL =
        "ws://localhost:${config.port}${devflow_1.routes.livereload}";
      const socket = new WebSocket(devflowLivereloadURL);
      socket.onmessage = function (event) {
        if (event.data === "reload") {
          window.location.reload();
        } else if (event.data === "reload-css"){
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"][data-dyn-css="true"]');
          stylesheets.forEach((sheet) => {
            const url = new URL(sheet.href);
            url.searchParams.set("t", Date.now().toString());
            sheet.href = url.toString();
          });
        } else console.log(event);
      };
    })();
  }
  </script>`
        : "";
}
function getStylesheets(config) {
    return [].flat().join("");
}
