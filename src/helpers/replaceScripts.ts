import { DevflowConfig } from "../parse-config";
import { routes } from "../devflow";

type ScriptAttributes = Record<string, string | true>;

interface ExtractedScript {
  tag: string; // original <script ...> string
  attrs: ScriptAttributes;
  filename: string; // basename of the src
}

function extractScriptsByAttributes(
  html: string,
  scriptAttributes: string[],
): ExtractedScript[] {
  const regex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gim;
  const extracted: ExtractedScript[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const attrString = match[1];
    const attrs: ScriptAttributes = {};

    // Parse all attributes
    attrString.replace(/([^\s=]+)(?:="([^"]*)")?/g, (_, name, value) => {
      attrs[name] = value ?? true;
      return "";
    });

    // Check if this script has any of the configured attributes
    if (scriptAttributes.some((attr) => attr in attrs)) {
      const src = attrs.src as string;
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

function removeScriptsFromHTML(
  html: string,
  scripts: ExtractedScript[],
): string {
  let cleanedHtml = html;
  for (const script of scripts) {
    // Escape for regex
    const escapedTag = script.tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    cleanedHtml = cleanedHtml.replace(new RegExp(escapedTag, "g"), "");
  }
  return cleanedHtml;
}

function updateScriptSrc(
  scripts: ExtractedScript[],
  config: DevflowConfig,
): ExtractedScript[] {
  return scripts.map((script) => {
    const matched = config.scriptList.find((s) => s === script.filename);
    if (matched) {
      return {
        ...script,
        attrs: { ...script.attrs, src: `${routes.dist}/${matched}` },
      };
    }
    return script;
  });
}

function buildScriptTags(scripts: ExtractedScript[]): string {
  return scripts
    .map((script) => {
      const attrString = Object.entries(script.attrs)
        .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
        .join(" ");
      return `<script ${attrString}></script>`;
    })
    .join("\n");
}

export function processHTML(
  html: string,
  config: DevflowConfig,
): { html: string; removedCount: number } {
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
  cleanedHtml = cleanedHtml.replace(
    "</body>",
    `${getReloadScript(config)}\n${buildScriptTags(updatedScripts)}</body>`,
  );

  return {
    html: cleanedHtml,
    removedCount: extractedScripts.length,
  };
}

export function getReloadScript(config: DevflowConfig): string {
  return config.livereload
    ? `<script>
  if ("WebSocket" in window) {
    (function () {
      const devflowLivereloadURL =
        "ws://localhost:${config.port}${routes.livereload}";
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

function getStylesheets(config: DevflowConfig): string {
  return [].flat().join("");
}
