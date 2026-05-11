import degit from "degit";
import fs from "fs-extra";
import path from "path";
import logger from "../helpers/logger.js";

export async function initAction(projectName: string) {
  const targetDir = path.join(process.cwd(), projectName);

  logger.info("Init", `Initializing project: ${projectName}...`);

  try {
    const emitter = degit("peakpointch/template", {
      cache: false,
      force: true,
    });
    await emitter.clone(targetDir);

    const pkgPath = path.join(targetDir, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = projectName;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    logger.info("Init", `Project ${projectName} created successfully!`);
    process.exit(0);
  } catch (err) {
    logger.error("Init", "Failed to initialize project!\n", err);
    process.exit(1);
  }
}
