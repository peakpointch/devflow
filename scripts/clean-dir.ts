import fs from "fs";
import path from "path";

/**
 * Deletes everything in a directory except for specific glob patterns.
 * @param dir The directory to clean (e.g., "dist")
 * @param except Array of glob patterns to preserve (e.g., ["extension/**"])
 */
export function cleanDirExcept(dir: string, except: string[] = []) {
  if (!fs.existsSync(dir)) return;

  const keptPaths = new Set(
    except.flatMap((pattern) =>
      fs.globSync(path.join(dir, pattern)).map((p) => path.resolve(p)),
    ),
  );

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.resolve(path.join(dir, item));

    if (!keptPaths.has(itemPath)) {
      fs.rmSync(itemPath, { recursive: true, force: true });
    }
  }
}
