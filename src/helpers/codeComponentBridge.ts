import fs from "fs";
import path from "path";

import type { PeakflowConfig } from "peakflow/config";

import { devLogger as logger } from "./taskLogger.js";
import {
  stringifyHtmlElement,
  findHtmlOpeningTags,
  replaceEmptyHtmlElements,
  replaceHtmlOpeningTags,
  setHtmlAttribute,
  type HtmlElement,
} from "./htmlRewriter.js";
import { routes } from "./routes.js";
import { codeIslandDataset, placeholderDataset } from "./dataset.js";

interface ClientLibraryManifest {
  components?: Record<string, unknown>;
}

interface ModuleFederationManifest {
  name?: string;
}

/**
 * A manifest for a Webflow `<code-island>` element.
 * Specify a component library and a code component to render.
 * Webflow will decide based in this info which component to render.
 */
interface CodeIslandLoader {
  tag: string;
  val: {
    clientModuleUrl: string;
    moduleId: string;
    submoduleId: string;
    exportPath?: string;
    serverModuleUrl?: string;
  };
}

export interface LocalCodeComponentLibrary {
  clientModuleUrl: string;
  componentIds: ReadonlySet<string>;
  moduleId: string;
}

function getHtmlLocale(html: string): string {
  const allHtmlTags = findHtmlOpeningTags(html, "html");
  const htmlTag = allHtmlTags[0];

  return typeof htmlTag?.attributes.lang === "string"
    ? htmlTag.attributes.lang
    : "en";
}

function isCodeIslandLoader(value: unknown): value is CodeIslandLoader {
  if (!value || typeof value !== "object") return false;

  const loader = value as Partial<CodeIslandLoader>;
  const val = loader.val;

  return (
    loader.tag === "FEDERATION" &&
    Boolean(val) &&
    typeof val?.clientModuleUrl === "string" &&
    typeof val.moduleId === "string" &&
    typeof val.submoduleId === "string"
  );
}

function parseCodeIslandLoader(
  codeIsland: HtmlElement,
): CodeIslandLoader | undefined {
  const loaderData = codeIsland.attributes[codeIslandDataset.attr.loader];

  if (typeof loaderData !== "string") {
    return undefined;
  }

  try {
    const loader: unknown = JSON.parse(loaderData);
    return isCodeIslandLoader(loader) ? loader : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Identify the one published federation module on the page that best matches
 * the components exposed by the local library.
 *
 * Returning undefined for an equally strong match avoids choosing between two
 * libraries that expose colliding component names.
 */
export function findPublishedModuleId(
  html: string,
  library: LocalCodeComponentLibrary,
): string | undefined {
  const matchingComponentsByModule = new Map<string, Set<string>>();

  for (const codeIsland of findHtmlOpeningTags(html, "code-island")) {
    const loader = parseCodeIslandLoader(codeIsland);

    if (!loader || !library.componentIds.has(loader.val.submoduleId)) {
      continue;
    }

    const matchingComponents =
      matchingComponentsByModule.get(loader.val.moduleId) ?? new Set<string>();
    matchingComponents.add(loader.val.submoduleId);
    matchingComponentsByModule.set(loader.val.moduleId, matchingComponents);
  }

  const candidates = [...matchingComponentsByModule.entries()].sort(
    (left, right) => right[1].size - left[1].size,
  );
  const [bestCandidate, secondBestCandidate] = candidates;

  if (!bestCandidate) {
    return undefined;
  }

  if (
    secondBestCandidate &&
    bestCandidate[1].size === secondBestCandidate[1].size
  ) {
    return undefined;
  }

  return bestCandidate[0];
}

function getClientManifestUrl(
  config: PeakflowConfig,
  manifestPath: string,
): string {
  const relativePath = path.relative(process.cwd(), manifestPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Code Component manifest must be inside the project directory: ${manifestPath}`,
    );
  }

  const urlPath = relativePath.split(path.sep).join("/");
  return `http://localhost:${config.devServer.port}${routes.app}/${urlPath}`;
}

/**
 * Find a Webflow Code Component client bundle generated in the project's build
 * output directory.
 */
export function loadLocalCodeComponentLibrary(
  config: PeakflowConfig,
): LocalCodeComponentLibrary | undefined {
  const clientDirectory = path.resolve(config.build.outdir, "Client");
  const clientManifestPath = path.join(clientDirectory, "wf-manifest.json");
  const federationManifestPath = path.join(clientDirectory, "mf-manifest.json");

  if (
    !fs.existsSync(clientManifestPath) ||
    !fs.existsSync(federationManifestPath)
  ) {
    return undefined;
  }

  const clientManifest = JSON.parse(
    fs.readFileSync(clientManifestPath, "utf8"),
  ) as ClientLibraryManifest;
  const federationManifest = JSON.parse(
    fs.readFileSync(federationManifestPath, "utf8"),
  ) as ModuleFederationManifest;

  const componentIds = new Set(Object.keys(clientManifest.components ?? {}));

  if (!federationManifest.name || componentIds.size === 0) {
    throw new Error("Local Code Component manifests are incomplete");
  }

  return {
    clientModuleUrl: getClientManifestUrl(config, clientManifestPath),
    componentIds,
    moduleId: federationManifest.name,
  };
}

/**
 * Replace published Webflow Code Components with the version of the local library.
 *
 * HTML matching and attribute rewriting are delegated to the shared rewriter.
 * This module only understands the Webflow loader payload and local library.
 */
export function replaceCodeComponents(
  html: string,
  library: LocalCodeComponentLibrary,
  publishedModuleId?: string,
): { html: string; replacedCount: number } {
  const targetModuleId =
    publishedModuleId ?? findPublishedModuleId(html, library);

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
        `https://github.com/peakpointch/peakflow-cli/issues`,
      );
    }

    // Skip replacement if the loader is invalid or the component is not
    // part of the local library.
    if (
      !loader ||
      !library.componentIds.has(loader.val.submoduleId) ||
      loader.val.moduleId !== targetModuleId
    ) {
      return codeIsland.openingTag;
    }

    // Skip replacement if the component is already from the local library.
    if (
      loader.val.clientModuleUrl === library.clientModuleUrl &&
      loader.val.moduleId === library.moduleId
    ) {
      return codeIsland.openingTag;
    }

    loader.val.clientModuleUrl = library.clientModuleUrl;
    loader.val.moduleId = library.moduleId;

    return setHtmlAttribute(
      codeIsland.openingTag,
      codeIslandDataset.attr.loader,
      JSON.stringify(loader),
    );
  });

  return { html: result.html, replacedCount: result.replacedCount };
}

/**
 * Replace empty Peakflow component placeholders with Code Islands that are
 * rendered by Webflow's existing client-side runtime.
 */
export function injectCodeComponents(
  html: string,
  library: LocalCodeComponentLibrary,
): { html: string; injectedCount: number } {
  const locale = getHtmlLocale(html);

  const result = replaceEmptyHtmlElements(html, "div", (placeholder) => {
    const componentId =
      placeholder.attributes[placeholderDataset.attr.component];

    if (
      typeof componentId !== "string" ||
      !library.componentIds.has(componentId)
    ) {
      return placeholder.outerHtml;
    }

    const propsData =
      placeholder.attributes[placeholderDataset.attr.props] ?? "{}";

    if (typeof propsData !== "string") {
      return placeholder.outerHtml;
    }

    let props: unknown;

    try {
      props = JSON.parse(propsData);
    } catch {
      return placeholder.outerHtml;
    }

    if (!props || typeof props !== "object" || Array.isArray(props)) {
      return placeholder.outerHtml;
    }

    const loader: CodeIslandLoader = {
      tag: "FEDERATION",
      val: {
        clientModuleUrl: library.clientModuleUrl,
        moduleId: library.moduleId,
        submoduleId: componentId,
        exportPath: "default",
        serverModuleUrl: "_",
      },
    };

    const renderRoot = stringifyHtmlElement({
      tagName: "div",
      attributes: {
        "data-root": true, // this will not render "true", is this a problem for webflow?
        style: "display:contents",
      },
    });

    const shadowRoot = stringifyHtmlElement({
      tagName: "template",
      attributes: {
        shadowrootmode: "open",
      },
      innerHtml: renderRoot,
    });

    const webflowContext = {
      mode: "publish", // Would be interesting to know what this does
      interactive: true,
      locale,
    };

    return stringifyHtmlElement({
      tagName: "code-island",
      attributes: {
        [codeIslandDataset.attr.loader]: JSON.stringify(loader),
        [codeIslandDataset.attr.props]: JSON.stringify(props),
        [codeIslandDataset.attr.slots]: "[]",
        [codeIslandDataset.attr.hydrate]: false, // this will remove the attribute, is this a problem for webflow?
        [codeIslandDataset.attr.webflowContext]: JSON.stringify(webflowContext),
        [codeIslandDataset.attr.interactive]: true, // this will not render "true", is this a problem for webflow?
        style: "display:contents",
      },
      innerHtml: shadowRoot,
    });
  });

  return { html: result.html, injectedCount: result.replacedCount };
}
