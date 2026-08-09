import fs from "fs";
import path from "path";
import logger from "../helpers/logger.js";
import {
  defaultConfigFileType,
  defaultConfigFileName,
  findConfigPath,
  configFileNames,
  resolveConfigPath
} from "../config/parse.js";
function configAction() {
  logger.scope = "Config";
  const existingPath = findConfigPath(process.cwd());
  if (existingPath) {
    logger.warn(
      `A "${configFileNames.glob}" config file already exists: ${existingPath}`
    );
    process.exit(0);
  }
  const configPath = resolveConfigPath(defaultConfigFileType, process.cwd());
  const templatePath = path.resolve(
    import.meta.dirname,
    "../../src/config/template.config.ts"
  );
  try {
    fs.copyFileSync(templatePath, configPath, fs.constants.COPYFILE_EXCL);
    logger.info(
      `Created ${logger.var(defaultConfigFileName)} successfully at ${logger.var(configPath)}`
    );
  } catch (err) {
    if (err.code === "EEXIST") {
      logger.warn(
        `A ${logger.var(defaultConfigFileName)} config file already exists: ${logger.var(configPath)}`
      );
      process.exit(0);
    } else {
      logger.error("Failed to create config file.\n", err);
      process.exit(1);
    }
  }
}
export {
  configAction
};
