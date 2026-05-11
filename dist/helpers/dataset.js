import { Dataset } from "peakflow/selector";
const dataset = Dataset.define({
  hmr: Dataset.Boolean("data-devflow-hmr"),
  local: Dataset.String("data-devflow-local"),
  href: Dataset.String("href")
});
export {
  dataset
};
