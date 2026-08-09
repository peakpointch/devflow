import fs from "fs";
import path from "path";
import type { WebflowConfig } from "../types/webflow.js";

/**
 * Parse the projects `webflow.json` config file
 * @returns The parsed `WebflowConfig`
 */
export function getWebflowConfig(): WebflowConfig {
  const configPath = path.resolve(process.cwd(), "webflow.json");
  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return rawConfig as WebflowConfig;
}
