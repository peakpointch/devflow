import type { PeakflowConfig } from "peakflow/config";

import { replaceAssets } from "./assetReplacer.js";
import {
  injectCodeComponents,
  type LocalCodeComponentLibrary,
  replaceCodeComponents,
} from "./codeComponentBridge.js";
import { placeholderDataset } from "./dataset.js";
import type { DevUrlOptions } from "./devUrl.js";
import { countHtmlElementsWithAttribute } from "./htmlRewriter.js";
import { devLogger as logger } from "./taskLogger.js";
import { pluralize } from "./utils.js";

export interface HtmlPipelineOptions extends DevUrlOptions {
  componentModuleId: string | undefined;
  config: PeakflowConfig;
  includeComponentDiagnostics: boolean;
  localCodeComponents: LocalCodeComponentLibrary | undefined;
}

export interface HtmlPipelineResult {
  assetMessage: string;
  componentDiagnosticMessage: string;
  componentMessage: string;
  html: string;
}

export function htmlPipeline(
  html: string,
  {
    componentModuleId,
    config,
    includeComponentDiagnostics,
    localCodeComponents,
    relativeUrls = false,
  }: HtmlPipelineOptions,
): HtmlPipelineResult {
  /* ========================== */
  /* ----- Modifying HTML ----- */
  /* ========================== */

  // 1. Replacing asset URLs
  const assetResult = replaceAssets(html, config, { relativeUrls });

  // 2. Replacing react components
  const componentResult = localCodeComponents
    ? replaceCodeComponents(
        assetResult.html,
        localCodeComponents,
        componentModuleId,
      )
    : { html: assetResult.html, replacedCount: 0 };

  const placeholderCountBefore = countHtmlElementsWithAttribute(
    componentResult.html,
    placeholderDataset.attr.component,
  );

  // 3. Injecting react components
  const injectionResult = localCodeComponents
    ? injectCodeComponents(componentResult.html, localCodeComponents)
    : { html: componentResult.html, injectedCount: 0 };
  const placeholderCountAfter = countHtmlElementsWithAttribute(
    injectionResult.html,
    placeholderDataset.attr.component,
  );

  /* ====================================== */
  /* ----- Build Messages for Logging ----- */
  /* ====================================== */

  const assetMessage = `Replaced ${logger.num(assetResult.replacedCount)} ${pluralize(
    "asset",
    assetResult.replacedCount,
  )}`;
  let componentMessage = "";
  let componentDiagnosticMessage = "";

  if (includeComponentDiagnostics) {
    componentDiagnosticMessage =
      "Code Component diagnostics: before " +
      logger.num(placeholderCountBefore) +
      ", injected " +
      logger.num(injectionResult.injectedCount) +
      ", after " +
      logger.num(placeholderCountAfter);
  }

  if (componentResult.replacedCount > 0) {
    componentMessage = `Replaced ${logger.num(componentResult.replacedCount)} local ${pluralize(
      "Code Component",
      componentResult.replacedCount,
    )}`;
  }

  if (injectionResult.injectedCount > 0) {
    const prefix = componentMessage ? "; " : "";
    componentMessage +=
      prefix +
      "Injected " +
      logger.num(injectionResult.injectedCount) +
      " local " +
      pluralize("Code Component", injectionResult.injectedCount);
  }

  return {
    assetMessage,
    componentDiagnosticMessage,
    componentMessage,
    html: injectionResult.html,
  };
}
