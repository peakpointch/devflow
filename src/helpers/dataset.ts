import { Dataset } from "peakflow/selector";

export const dataset = Dataset.define({
  hmr: Dataset.Boolean("data-peakflow-hmr"),
  local: Dataset.String("data-peakflow-local"),
  href: Dataset.String("href"),
});
