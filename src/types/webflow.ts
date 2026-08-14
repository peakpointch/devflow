/**
 * The Webflow config from "webflow.json"
 */
export interface WebflowConfig {
  library: WebflowLibrary;
  telemetry: WebflowTelemetry;
  siteId: string;
}

interface WebflowLibrary {
  name: string;
  components: string[];
  description?: string;
  bundleConfig?: string;
  id: string;
}

interface WebflowTelemetry {
  [x: string]: any;
}
