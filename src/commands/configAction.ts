import fs from "fs";
import path from "path";
import logger from "../helpers/logger.js";

export function configAction(filePath: string): void {
  if (fs.existsSync(path.resolve(filePath))) {
    logger.warn("Config", `A "${filePath}" config file already exists.`);
    return;
  }

  const template = fs.readFileSync(
    path.resolve(process.cwd(), "./template.confit.ts"),
  );

  fs.writeFileSync(path.resolve(filePath), template);
  logger.info("Config", `${filePath} created successfully`);
}
