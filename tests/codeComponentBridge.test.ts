import { describe, expect, test } from "@jest/globals";
import path from "node:path";

import {
  findPublishedModuleId,
  getClientManifestUrl,
  injectCodeComponents,
  type LocalCodeComponentLibrary,
  replaceCodeComponents,
} from "../src/helpers/codeComponentBridge.js";
import {
  codeIslandDataset,
  placeholderDataset,
} from "../src/helpers/dataset.js";
import { findHtmlOpeningTags } from "../src/helpers/htmlRewriter.js";

const library: LocalCodeComponentLibrary = {
  clientModuleUrl: "http://localhost:4000/__app/dist/Client/wf-manifest.json",
  componentIds: new Set(["Clock", "MenuCard"]),
  moduleId: "_SanavitaComponents",
};

interface Loader {
  tag: string;
  val: {
    clientModuleUrl: string;
    moduleId: string;
    submoduleId: string;
    exportPath?: string;
    serverModuleUrl?: string;
  };
}

function loader(
  submoduleId = "MenuCard",
  moduleId = "_publishedLibraryId",
): Loader {
  return {
    tag: "FEDERATION",
    val: {
      clientModuleUrl:
        "https://code-components.website-files.com/library/module/wf-manifest.json",
      moduleId,
      submoduleId,
      exportPath: "default",
      serverModuleUrl: "_",
    },
  };
}

function codeIsland(
  submoduleId = "MenuCard",
  moduleId = "_publishedLibraryId",
  quote: '"' | "'" = '"',
): string {
  const loaderData = JSON.stringify(loader(submoduleId, moduleId));
  const encodedLoader =
    quote === '"' ? loaderData.replaceAll('"', "&quot;") : loaderData;

  return `<code-island ${codeIslandDataset.attr.loader}=${quote}${encodedLoader}${quote}></code-island>`;
}

function readLoaders(html: string): Loader[] {
  return findHtmlOpeningTags(html, "code-island").map((codeIsland) => {
    const loaderData = codeIsland.attributes[codeIslandDataset.attr.loader];

    if (typeof loaderData !== "string") {
      throw new Error("Expected code-island loader data.");
    }

    return JSON.parse(loaderData) as Loader;
  });
}

describe(replaceCodeComponents.name, () => {
  test("redirects a matching published component to the local library", () => {
    const html = `${codeIsland()}<div data-unchanged="true"></div>`;

    const result = replaceCodeComponents(html, library);
    const [replacedLoader] = readLoaders(result.html);

    expect(result.replacedCount).toBe(1);
    expect(replacedLoader?.val).toMatchObject({
      clientModuleUrl: library.clientModuleUrl,
      moduleId: library.moduleId,
      submoduleId: "MenuCard",
      exportPath: "default",
      serverModuleUrl: "_",
    });
    expect(result.html).toContain('<div data-unchanged="true"></div>');
  });

  test("supports single-quoted loader attributes", () => {
    const result = replaceCodeComponents(
      codeIsland("MenuCard", "_publishedLibraryId", "'"),
      library,
    );

    expect(result.replacedCount).toBe(1);
    expect(readLoaders(result.html)[0]?.val.moduleId).toBe(library.moduleId);
  });

  test("leaves absent and malformed components unchanged", () => {
    const html =
      codeIsland("OtherComponent") +
      `<code-island ${codeIslandDataset.attr.loader}="{&quot;tag&quot;:"></code-island>`;

    expect(replaceCodeComponents(html, library)).toEqual({
      html,
      replacedCount: 0,
    });
  });

  test("uses an explicit published module ID instead of automatic matching", () => {
    const html =
      codeIsland("MenuCard", "_firstLibrary") +
      codeIsland("Clock", "_secondLibrary");

    const result = replaceCodeComponents(html, library, "_secondLibrary");
    const moduleIds = readLoaders(result.html).map(
      (componentLoader) => componentLoader.val.moduleId,
    );

    expect(result.replacedCount).toBe(1);
    expect(moduleIds).toEqual(["_firstLibrary", library.moduleId]);
  });
});

describe(findPublishedModuleId.name, () => {
  test("selects the library with the most distinct local components", () => {
    const html = [
      codeIsland("MenuCard", "_bestMatch"),
      codeIsland("Clock", "_bestMatch"),
      codeIsland("MenuCard", "_otherLibrary"),
    ].join("");

    expect(findPublishedModuleId(html, library)).toBe("_bestMatch");
  });

  test("returns undefined for equally strong library matches", () => {
    const html =
      codeIsland("MenuCard", "_firstLibrary") +
      codeIsland("Clock", "_secondLibrary");

    expect(findPublishedModuleId(html, library)).toBeUndefined();
  });

  test("does not let duplicate placements outweigh distinct component matches", () => {
    const html = [
      codeIsland("MenuCard", "_firstLibrary"),
      codeIsland("MenuCard", "_firstLibrary"),
      codeIsland("Clock", "_secondLibrary"),
    ].join("");

    expect(findPublishedModuleId(html, library)).toBeUndefined();
  });
});

describe(injectCodeComponents.name, () => {
  test("replaces a local placeholder with a complete code island", () => {
    const html =
      `<html lang="de"><body><div ${placeholderDataset.attr.component}="Clock" ` +
      `${placeholderDataset.attr.props}="{&quot;timezone&quot;:&quot;Europe/Zurich&quot;}"></div></body></html>`;

    const result = injectCodeComponents(html, library);
    const codeIsland = findHtmlOpeningTags(result.html, "code-island")[0];
    const injectedLoader = readLoaders(result.html)[0];

    expect(result.injectedCount).toBe(1);
    expect(injectedLoader?.val).toMatchObject({
      clientModuleUrl: library.clientModuleUrl,
      moduleId: library.moduleId,
      submoduleId: "Clock",
      exportPath: "default",
      serverModuleUrl: "_",
    });
    expect(
      JSON.parse(String(codeIsland?.attributes[codeIslandDataset.attr.props])),
    ).toEqual({ timezone: "Europe/Zurich" });
    expect(
      JSON.parse(
        String(codeIsland?.attributes[codeIslandDataset.attr.webflowContext]),
      ),
    ).toEqual({ mode: "publish", interactive: true, locale: "de" });
    expect(codeIsland?.attributes[codeIslandDataset.attr.interactive]).toBe(
      true,
    );
    expect(result.html).toContain(
      '<template shadowrootmode="open"><div data-root style="display:contents"></div></template>',
    );
  });

  test("uses empty props and the default locale when omitted", () => {
    const html = `<html><body><div ${placeholderDataset.attr.component}="Clock"></div></body></html>`;

    const result = injectCodeComponents(html, library);
    const codeIsland = findHtmlOpeningTags(result.html, "code-island")[0];

    expect(result.injectedCount).toBe(1);
    expect(
      JSON.parse(String(codeIsland?.attributes[codeIslandDataset.attr.props])),
    ).toEqual({});
    expect(
      JSON.parse(
        String(codeIsland?.attributes[codeIslandDataset.attr.webflowContext]),
      ).locale,
    ).toBe("en");
  });

  test("leaves unknown, invalid, and non-empty placeholders unchanged", () => {
    const html = [
      "<html><body>",
      `<div ${placeholderDataset.attr.component}="Unknown"></div>`,
      `<div ${placeholderDataset.attr.component}="Clock" ${placeholderDataset.attr.props}="[]"></div>`,
      `<div ${placeholderDataset.attr.component}="Clock">Existing content</div>`,
      "</body></html>",
    ].join("");

    expect(injectCodeComponents(html, library)).toEqual({
      html,
      injectedCount: 0,
    });
  });
});

describe(getClientManifestUrl.name, () => {
  const config = {
    devServer: { port: 4000 },
  } as Parameters<typeof getClientManifestUrl>[0];
  const manifestPath = path.join(
    process.cwd(),
    "dist",
    "Client",
    "wf-manifest.json",
  );

  test("uses localhost by default", () => {
    expect(getClientManifestUrl(config, manifestPath)).toBe(
      "http://localhost:4000/__app/dist/Client/wf-manifest.json",
    );
  });

  test("uses a root-relative URL when enabled", () => {
    expect(
      getClientManifestUrl(config, manifestPath, { relativeUrls: true }),
    ).toBe("/__app/dist/Client/wf-manifest.json");
  });
});
