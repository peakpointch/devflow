import { configSchema, type PeakflowConfig } from "peakflow/config";
import { createJiti } from "jiti";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import logger from "../helpers/logger.js";

export type ConfigFileType = "ts" | "js" | "mjs" | "json" | "glob";
export type ConfigFiles = Record<ConfigFileType, string>;

export const configFileNames: ConfigFiles = {
  ts: "peakflow.config.ts",
  js: "peakflow.config.js",
  mjs: "peakflow.config.mjs",
  json: "peakflow.config.json",
  glob: "peakflow.config.{ts|js|mjs|json}",
};

export const defaultConfigFileType = "ts";
export const defaultConfigFileName = configFileNames[defaultConfigFileType];

export function resolveConfigPath(type: ConfigFileType, dir: string): string {
  return path.resolve(dir, configFileNames[type]) as string;
}

export function resolveAllConfigPaths(dir: string): ConfigFiles {
  const resolved: Partial<ConfigFiles> = {};
  for (const type in configFileNames) {
    resolved[type as ConfigFileType] = resolveConfigPath(
      type as ConfigFileType,
      dir,
    );
  }
  return resolved as ConfigFiles;
}

export function findConfigPath(dir: string): string | undefined {
  const matches = fs.globSync(path.resolve(dir, configFileNames.glob));
  return matches[0];
}

export function configExists(dir: string): boolean {
  return fs.globSync(path.resolve(dir, configFileNames.glob)).length > 0;
}

export async function parseConfig(): Promise<PeakflowConfig> {
  let rawConfig: any;
  const configPath = findConfigPath(process.cwd());

  if (!configPath) {
    throw new Error(
      `Could not find "${configFileNames["glob"]}" in the current directory.`,
    );
  }

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
  logger.setScope("Config");

  let config: PeakflowConfig;

  try {
    if (configExists(process.cwd())) {
      config = await parseConfig();
    } else {
      logger.error(
        `Config not found. Use ${chalk.cyan("peakflow config")} to create a config file in your project root, or manually create one yourself.`,
        logger.newLine,
        `Accepted configs: ${configFileNames.glob}`,
      );
      process.exit(1);
    }
  } catch (err) {
    logger.error("Failed to parse config:", err);
    process.exit(1);
  }

  return config;
}
