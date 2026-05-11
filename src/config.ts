import { configSchema, type PeakflowConfig } from "peakflow/config";
import { createJiti } from "jiti";
import fs from "fs";
import path from "path";
import logger from "./helpers/logger.js";

export async function parseConfig(
  cwd: string = process.cwd(),
): Promise<PeakflowConfig> {
  const fileNames = [
    "peakflow.config.ts",
    "peakflow.config.js",
    "peakflow.config.mjs",
    "peakflow.config.json",
  ];

  const filePaths = fileNames.map((name) => path.resolve(cwd, name));
  const configPath = filePaths.find((path) => fs.existsSync(path));

  if (!configPath) {
    throw new Error(
      `Could not find peakflow.config.ts in the current directory.`,
    );
  }

  let rawConfig: any;

  if (configPath.endsWith(".json")) {
    rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    const jiti = createJiti(import.meta.url);
    const module = await jiti.import(configPath, { default: true });
    rawConfig = module;
  }

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    const message = ["Invalid peakflow.config.ts structure:"];
    result.error.issues.forEach((issue) => {
      message.push(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error(message.join("\n"));
  }

  return result.data;
}

export async function parseConfigCli(): Promise<PeakflowConfig> {
  let config: PeakflowConfig;

  try {
    config = await parseConfig();
  } catch (err) {
    logger.setScope("Config");
    logger.error("Failed to parse config:", err);
    process.exit(1);
  }

  return config;
}
