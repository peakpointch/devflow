import fs from "fs-extra";
import path from "path";
import { downloadTemplate } from "giget";
import logger from "../helpers/logger.js";
async function initAction(projectName) {
  logger.setScope("Init");
  logger.info(`Initializing project: ${projectName}...`);
  const targetDir = path.join(process.cwd(), projectName);
  try {
    await downloadTemplate("github:peakpointch/template", {
      dir: targetDir,
      preferOffline: false,
      force: true
    });
    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = projectName;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }
    logger.info(`Project ${projectName} created successfully!`);
    process.exit(0);
  } catch (err) {
    logger.error("Failed to initialize project!\n", err);
    process.exit(1);
  }
}
export {
  initAction
};
