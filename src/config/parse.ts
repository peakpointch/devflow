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

/**
 * Parse config at `configPath`.
 * @param configPath Verified and fully resolved path to a `peakflow.config.{ts|js|mjs|json}` config file.
 * @returns The sanitized and fully typed config as a promise.
 */
export async function parseConfig(configPath: string): Promise<PeakflowConfig> {
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
    const message = ["Invalid config structure:"];
    result.error.issues.forEach((issue) => {
      message.push(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    throw new Error(message.join("\n"));
  }

  return result.data;
}

export async function parseConfigAction(): Promise<PeakflowConfig> {
  logger.setScope("Config");

  let config: PeakflowConfig;

  try {
    const configPath = findConfigPath(process.cwd());
    if (configPath) {
      config = await parseConfig(configPath);
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
