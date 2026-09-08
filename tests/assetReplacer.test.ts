import { describe, expect, test } from "@jest/globals";
import type { PeakflowConfig } from "peakflow/config";

import { assetDataset } from "../src/helpers/dataset.js";
import { replaceAssets } from "../src/helpers/assetReplacer.js";

function config(livereload: boolean): PeakflowConfig {
  return {
    repository: { owner: "peakpoint", name: "website" },
    devServer: {
      webflowSubdomain: "peakpoint",
      port: 4000,
      livereload,
      watchList: ["./src"],
    },
    build: { modules: [], outdir: "./dist" },
    environments: [],
  };
}

describe(replaceAssets.name, () => {
  test("replaces marked script and stylesheet URLs in place", () => {
    const html = [
      `<html><head>`,
      `<script async `,
      `${assetDataset.attr.hmr}="true" `,
      `${assetDataset.attr.local}="scripts/app.js" `,
      `src="https://cdn.example.com/app.js" `,
      `${assetDataset.attr.integrity}="script-hash"`,
      `>window.ready = true;</script>`,
      `<meta name="between">`,
      `\n`,
      `<link rel='StyleSheet' media='screen' `,
      `${assetDataset.attr.local}='styles/app.css' `,
      `${assetDataset.attr.hmr}='true' `,
      `href='https://cdn.example.com/app.css' `,
      `${assetDataset.attr.integrity}='style-hash'`,
      `>`,
      `</head><body><main>Page</main></body></html>`,
    ].join("");

    const cfg = config(false);
    const result = replaceAssets(html, cfg);

    expect(result.replacedCount).toBe(2);
    expect(result.html).toContain(
      `src="http://localhost:${cfg.devServer.port}/__app/scripts/app.js"`,
    );
    expect(result.html).toContain(
      `href="http://localhost:${cfg.devServer.port}/__app/styles/app.css"`,
    );
    expect(result.html).not.toContain(`${assetDataset.attr.integrity}=`);
    expect(result.html).toContain("<script async");
    expect(result.html).toContain("window.ready = true;</script>");
    expect(result.html).toContain("media='screen'");
    expect(result.html.indexOf("<script")).toBeLessThan(
      result.html.indexOf('<meta name="between">'),
    );
    expect(result.html.indexOf('<meta name="between">')).toBeLessThan(
      result.html.indexOf("<link"),
    );
  });

  test("supports case-insensitive names and encoded local paths", () => {
    const html = `<SCRIPT ${assetDataset.attr.hmr.toUpperCase()}="true" ${assetDataset.attr.local.toUpperCase()}="scripts/app.js?x=1&amp;y=2" SRC="production.js"></SCRIPT><body></body>`;

    const cfg = config(false);
    const result = replaceAssets(html, cfg);

    expect(result.replacedCount).toBe(1);
    expect(result.html).toContain(
      `src="http://localhost:${cfg.devServer.port}/__app/scripts/app.js?x=1&amp;y=2"`,
    );
  });

  test("uses root-relative script and stylesheet URLs when enabled", () => {
    const html = [
      `<script ${assetDataset.attr.hmr}="true" ${assetDataset.attr.local}="scripts/app.js" src="production.js"></script>`,
      `<link rel="stylesheet" ${assetDataset.attr.hmr}="true" ${assetDataset.attr.local}="styles/app.css" href="production.css">`,
    ].join("");

    const result = replaceAssets(html, config(false), {
      relativeUrls: true,
    });

    expect(result.html).toContain(`src="/__app/scripts/app.js"`);
    expect(result.html).toContain(`href="/__app/styles/app.css"`);
  });

  test("ignores unmarked, disabled, malformed, and non-stylesheet assets", () => {
    const html = [
      `<script ${assetDataset.attr.local}="scripts/unmarked.js" src="production.js"></script>`,
      `<script ${assetDataset.attr.hmr}="false" ${assetDataset.attr.local}="scripts/disabled.js" src="production.js"></script>`,
      `<script ${assetDataset.attr.hmr}="true" ${assetDataset.attr.local} src="production.js"></script>`,
      `<link rel="preload" ${assetDataset.attr.hmr}="true" ${assetDataset.attr.local}="styles/app.css" href="production.css">`,
      `<body></body>`,
    ].join("");

    const result = replaceAssets(html, config(false));

    expect(result).toEqual({ html, replacedCount: 0 });
  });

  test("injects the reload client before the closing body tag", () => {
    const html = "<html><body><main>Page</main></body></html>";

    const result = replaceAssets(html, config(true));

    expect(result.replacedCount).toBe(0);
    expect(result.html).toBe(
      `<html><body><main>Page</main>` +
        `<script src="/__server/src/extension/dist/client.js" defer></script>\n` +
        `</body></html>`,
    );
  });

  test("does not inject the reload client when livereload is disabled", () => {
    const html = "<html><body></body></html>";

    expect(replaceAssets(html, config(false))).toEqual({
      html,
      replacedCount: 0,
    });
  });
});
