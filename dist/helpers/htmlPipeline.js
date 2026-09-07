import { replaceAssets } from "./assetReplacer.js";
import {
  injectCodeComponents,
  replaceCodeComponents
} from "./codeComponentBridge.js";
import { placeholderDataset } from "./dataset.js";
import { countHtmlElementsWithAttribute } from "./htmlRewriter.js";
import { devLogger as logger } from "./taskLogger.js";
import { pluralize } from "./utils.js";
function htmlPipeline(html, {
  componentModuleId,
  config,
  includeComponentDiagnostics,
  localCodeComponents
}) {
  const assetResult = replaceAssets(html, config);
  const componentResult = localCodeComponents ? replaceCodeComponents(
    assetResult.html,
    localCodeComponents,
    componentModuleId
  ) : { html: assetResult.html, replacedCount: 0 };
  const placeholderCountBefore = countHtmlElementsWithAttribute(
    componentResult.html,
    placeholderDataset.attr.component
  );
  const injectionResult = localCodeComponents ? injectCodeComponents(componentResult.html, localCodeComponents) : { html: componentResult.html, injectedCount: 0 };
  const placeholderCountAfter = countHtmlElementsWithAttribute(
    injectionResult.html,
    placeholderDataset.attr.component
  );
  const assetMessage = `Replaced ${logger.num(assetResult.replacedCount)} ${pluralize(
    "asset",
    assetResult.replacedCount
  )}`;
  let componentMessage = "";
  let componentDiagnosticMessage = "";
  if (includeComponentDiagnostics) {
    componentDiagnosticMessage = "Code Component diagnostics: before " + logger.num(placeholderCountBefore) + ", injected " + logger.num(injectionResult.injectedCount) + ", after " + logger.num(placeholderCountAfter);
  }
  if (componentResult.replacedCount > 0) {
    componentMessage = `Replaced ${logger.num(componentResult.replacedCount)} local ${pluralize(
      "Code Component",
      componentResult.replacedCount
    )}`;
  }
  if (injectionResult.injectedCount > 0) {
    const prefix = componentMessage ? "; " : "";
    componentMessage += prefix + "Injected " + logger.num(injectionResult.injectedCount) + " local " + pluralize("Code Component", injectionResult.injectedCount);
  }
  return {
    assetMessage,
    componentDiagnosticMessage,
    componentMessage,
    html: injectionResult.html
  };
}
export {
  htmlPipeline
};
