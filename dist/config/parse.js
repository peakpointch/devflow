import { configSchema } from "peakflow/config";
import { createJiti } from "jiti";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import logger from "../helpers/logger.js";
const configFileNames = {
  ts: "peakflow.config.ts",
  js: "peakflow.config.js",
  mjs: "peakflow.config.mjs",
  json: "peakflow.config.json",
  glob: "peakflow.config.{ts|js|mjs|json}"
};
const defaultConfigFileType = "ts";
const defaultConfigFileName = configFileNames[defaultConfigFileType];
function resolveConfigPath(type, dir) {
  return path.resolve(dir, configFileNames[type]);
}
function resolveAllConfigPaths(dir) {
  const resolved = {};
  for (const type in configFileNames) {
    resolved[type] = resolveConfigPath(
      type,
      dir
    );
  }
  return resolved;
}
function findConfigPath(dir) {
  const matches = fs.globSync(path.resolve(dir, configFileNames.glob));
  return matches[0];
}
function configExists(dir) {
  return fs.globSync(path.resolve(dir, configFileNames.glob)).length > 0;
}
async function parseConfig(configPath) {
  let rawConfig;
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
async function parseConfigAction() {
  logger.setScope("Config");
  let config;
  try {
    const configPath = findConfigPath(process.cwd());
    if (configPath) {
      config = await parseConfig(configPath);
    } else {
      logger.error(
        `Config not found. Use ${chalk.cyan("peakflow config")} to create a config file in your project root, or manually create one yourself.`,
        logger.newLine,
        `Accepted configs: ${configFileNames.glob}`
      );
      process.exit(1);
    }
  } catch (err) {
    logger.error("Failed to parse config:", err);
    process.exit(1);
  }
  return config;
}
export {
  configExists,
  configFileNames,
  defaultConfigFileName,
  defaultConfigFileType,
  findConfigPath,
  parseConfig,
  parseConfigAction,
  resolveAllConfigPaths,
  resolveConfigPath
};
