import fs from "fs";
import path from "path";
import { getDevServerUrl } from "./devUrl.js";
import { devLogger as logger } from "./taskLogger.js";
import {
  stringifyHtmlElement,
  findHtmlOpeningTags,
  replaceEmptyHtmlElements,
  replaceHtmlOpeningTags,
  setHtmlAttribute
} from "./htmlRewriter.js";
import { routes } from "./routes.js";
import { codeIslandDataset, placeholderDataset } from "./dataset.js";
function getHtmlLocale(html) {
  const allHtmlTags = findHtmlOpeningTags(html, "html");
  const htmlTag = allHtmlTags[0];
  return typeof htmlTag?.attributes.lang === "string" ? htmlTag.attributes.lang : "en";
}
function isCodeIslandLoader(value) {
  if (!value || typeof value !== "object") return false;
  const loader = value;
  const val = loader.val;
  return loader.tag === "FEDERATION" && Boolean(val) && typeof val?.clientModuleUrl === "string" && typeof val.moduleId === "string" && typeof val.submoduleId === "string";
}
function parseCodeIslandLoader(codeIsland) {
  const loaderData = codeIsland.attributes[codeIslandDataset.attr.loader];
  if (typeof loaderData !== "string") {
    return void 0;
  }
  try {
    const loader = JSON.parse(loaderData);
    return isCodeIslandLoader(loader) ? loader : void 0;
  } catch {
    return void 0;
  }
}
function findPublishedModuleId(html, library) {
  const matchingComponentsByModule = /* @__PURE__ */ new Map();
  for (const codeIsland of findHtmlOpeningTags(html, "code-island")) {
    const loader = parseCodeIslandLoader(codeIsland);
    if (!loader || !library.componentIds.has(loader.val.submoduleId)) {
      continue;
    }
    const matchingComponents = matchingComponentsByModule.get(loader.val.moduleId) ?? /* @__PURE__ */ new Set();
    matchingComponents.add(loader.val.submoduleId);
    matchingComponentsByModule.set(loader.val.moduleId, matchingComponents);
  }
  const candidates = [...matchingComponentsByModule.entries()].sort(
    (left, right) => right[1].size - left[1].size
  );
  const [bestCandidate, secondBestCandidate] = candidates;
  if (!bestCandidate) {
    return void 0;
  }
  if (secondBestCandidate && bestCandidate[1].size === secondBestCandidate[1].size) {
    return void 0;
  }
  return bestCandidate[0];
}
function getClientManifestUrl(config, manifestPath, options) {
  const relativePath = path.relative(process.cwd(), manifestPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Code Component manifest must be inside the project directory: ${manifestPath}`
    );
  }
  const urlPath = relativePath.split(path.sep).join("/");
  return getDevServerUrl(config, `${routes.app}/${urlPath}`, options);
}
function loadLocalCodeComponentLibrary(config, options) {
  const clientDirectory = path.resolve(config.build.outdir, "Client");
  const clientManifestPath = path.join(clientDirectory, "wf-manifest.json");
  const federationManifestPath = path.join(clientDirectory, "mf-manifest.json");
  if (!fs.existsSync(clientManifestPath) || !fs.existsSync(federationManifestPath)) {
    return void 0;
  }
  const clientManifest = JSON.parse(
    fs.readFileSync(clientManifestPath, "utf8")
  );
  const federationManifest = JSON.parse(
    fs.readFileSync(federationManifestPath, "utf8")
  );
  const componentIds = new Set(Object.keys(clientManifest.components ?? {}));
  if (!federationManifest.name || componentIds.size === 0) {
    throw new Error("Local Code Component manifests are incomplete");
  }
  return {
    clientModuleUrl: getClientManifestUrl(config, clientManifestPath, options),
    componentIds,
    moduleId: federationManifest.name
  };
}
function replaceCodeComponents(html, library, publishedModuleId) {
  const targetModuleId = publishedModuleId ?? findPublishedModuleId(html, library);
  if (!targetModuleId) {
    return { html, replacedCount: 0 };
  }
  const result = replaceHtmlOpeningTags(html, "code-island", (codeIsland) => {
    const loader = parseCodeIslandLoader(codeIsland);
    if (!loader) {
      logger.warn(
        `Found a ${logger.var("<code-island>")} element with an unexpected`,
        `or missing ${logger.var(codeIslandDataset.attr.loader)} attribute. Webflow may`,
        `have changed the code-island client API. This component will be`,
        `skipped.`,
        logger.nextLine,
        `Please consider opening a GitHub issue at:`,
        logger.nextLine,
        `https://github.com/peakpointch/peakflow-cli/issues`
      );
    }
    if (!loader || !library.componentIds.has(loader.val.submoduleId) || loader.val.moduleId !== targetModuleId) {
      return codeIsland.openingTag;
    }
    if (loader.val.clientModuleUrl === library.clientModuleUrl && loader.val.moduleId === library.moduleId) {
      return codeIsland.openingTag;
    }
    loader.val.clientModuleUrl = library.clientModuleUrl;
    loader.val.moduleId = library.moduleId;
    return setHtmlAttribute(
      codeIsland.openingTag,
      codeIslandDataset.attr.loader,
      JSON.stringify(loader)
    );
  });
  return { html: result.html, replacedCount: result.replacedCount };
}
function injectCodeComponents(html, library) {
  const locale = getHtmlLocale(html);
  const result = replaceEmptyHtmlElements(html, "div", (placeholder) => {
    const componentId = placeholder.attributes[placeholderDataset.attr.component];
    if (typeof componentId !== "string" || !library.componentIds.has(componentId)) {
      return placeholder.outerHtml;
    }
    const propsData = placeholder.attributes[placeholderDataset.attr.props] ?? "{}";
    if (typeof propsData !== "string") {
      return placeholder.outerHtml;
    }
    let props;
    try {
      props = JSON.parse(propsData);
    } catch {
      return placeholder.outerHtml;
    }
    if (!props || typeof props !== "object" || Array.isArray(props)) {
      return placeholder.outerHtml;
    }
    const loader = {
      tag: "FEDERATION",
      val: {
        clientModuleUrl: library.clientModuleUrl,
        moduleId: library.moduleId,
        submoduleId: componentId,
        exportPath: "default",
        serverModuleUrl: "_"
      }
    };
    const renderRoot = stringifyHtmlElement({
      tagName: "div",
      attributes: {
        "data-root": true,
        // this will not render "true", is this a problem for webflow?
        style: "display:contents"
      }
    });
    const shadowRoot = stringifyHtmlElement({
      tagName: "template",
      attributes: {
        shadowrootmode: "open"
      },
      innerHtml: renderRoot
    });
    const webflowContext = {
      mode: "publish",
      // Would be interesting to know what this does
      interactive: true,
      locale
    };
    return stringifyHtmlElement({
      tagName: "code-island",
      attributes: {
        [codeIslandDataset.attr.loader]: JSON.stringify(loader),
        [codeIslandDataset.attr.props]: JSON.stringify(props),
        [codeIslandDataset.attr.slots]: "[]",
        [codeIslandDataset.attr.hydrate]: false,
        // this will remove the attribute, is this a problem for webflow?
        [codeIslandDataset.attr.webflowContext]: JSON.stringify(webflowContext),
        [codeIslandDataset.attr.interactive]: true,
        // this will not render "true", is this a problem for webflow?
        style: "display:contents"
      },
      innerHtml: shadowRoot
    });
  });
  return { html: result.html, injectedCount: result.replacedCount };
}
export {
  findPublishedModuleId,
  getClientManifestUrl,
  injectCodeComponents,
  loadLocalCodeComponentLibrary,
  replaceCodeComponents
};
