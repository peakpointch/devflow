import { Dataset } from "peakflow/selector";
const assetDataset = Dataset.define({
  hmr: Dataset.Boolean("data-peakflow-hmr"),
  local: Dataset.String("data-peakflow-local"),
  integrity: Dataset.String("integrity")
});
const styleSheetDataset = Dataset.define({
  hmr: assetDataset.definition.hmr,
  local: assetDataset.definition.local,
  integrity: assetDataset.definition.integrity,
  rel: Dataset.String("rel"),
  href: Dataset.String("href")
});
const scriptDataset = Dataset.define({
  hmr: assetDataset.definition.hmr,
  local: assetDataset.definition.local,
  integrity: assetDataset.definition.integrity,
  src: Dataset.String("src")
});
const codeIslandDataset = Dataset.define({
  loader: Dataset.String("data-loader"),
  props: Dataset.String("data-props"),
  slots: Dataset.String("data-slots"),
  hydrate: Dataset.Boolean("data-hydrate"),
  webflowContext: Dataset.String("data-webflow-context"),
  interactive: Dataset.Boolean("data-interactive")
});
const placeholderDataset = Dataset.define({
  component: Dataset.String("data-peakflow-component"),
  props: Dataset.String("data-peakflow-props")
});
export {
  assetDataset,
  codeIslandDataset,
  placeholderDataset,
  scriptDataset,
  styleSheetDataset
};
