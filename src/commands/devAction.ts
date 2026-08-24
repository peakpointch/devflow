import chokidar from "chokidar";
import events from "events";
import path from "node:path";

import { devLogger as logger } from "../helpers/taskLogger.js";
import { parseConfigAction } from "../config/parse.js";
import { buildDev } from "../build.js";
import {
  createCodeComponentBuilder,
  isCodeComponentBuildInput,
  type CodeComponentBuildResult,
} from "../buildCodeComponents.js";
import { startWebflowProxy } from "../server.js";

/**
 * Start the dev server (with livereload)
 */
export interface DevOptions {
  componentModuleId?: string;
}

function logCodeComponentBuild(buildResult: CodeComponentBuildResult): void {
  logger.success(
    "Compiled",
    logger.num(buildResult.componentIds.size),
    buildResult.componentIds.size === 1 ? "Code Component" : "Code Components",
    "in",
    logger.num(`${Math.round(buildResult.duration)}ms`),
  );
}

function getAdditionalWatchFiles(
  watchList: string[],
  inputFiles: ReadonlySet<string>,
): string[] {
  return [...inputFiles].filter((inputFile) =>
    watchList.every((watchedPath) => {
      const relativePath = path.relative(
        path.resolve(watchedPath),
        path.resolve(inputFile),
      );

      return (
        relativePath !== "" &&
        (relativePath.startsWith("..") || path.isAbsolute(relativePath))
      );
    }),
  );
}

export async function devAction({ componentModuleId }: DevOptions = {}) {
  const config = await parseConfigAction();
  const reloadEmitter = new events.EventEmitter();

  logger.info("Read the docs at https://github.com/peakpointch/peakflow-cli");

  // Initial build
  await buildDev(config);

  const codeComponentBuilder = await createCodeComponentBuilder(config);
  let codeComponentBuild = await codeComponentBuilder?.build();

  if (codeComponentBuild) {
    logCodeComponentBuild(codeComponentBuild);
  }

  // Start webflow proxy server, mirroring the .webflow.io staging domain
  startWebflowProxy(config, reloadEmitter, componentModuleId);
  reloadEmitter.emit("script-change", config.build.modules);

  // Watch for changes
  const watcher = chokidar.watch(config.devServer.watchList, {
    ignoreInitial: true,
  });

  if (codeComponentBuild) {
    watcher.add(
      getAdditionalWatchFiles(
        config.devServer.watchList,
        codeComponentBuild.inputFiles,
      ),
    );
  }

  let watcherBatchTimer: NodeJS.Timeout | undefined;
  let watcherBuildRunning = false;
  const pendingWatcherChanges = new Map<string, string>();

  async function processWatcherChanges(
    changedFiles: string[],
  ): Promise<"script" | "styles" | undefined> {
    const componentChanges = changedFiles.filter(
      (filePath) =>
        codeComponentBuild &&
        isCodeComponentBuildInput(codeComponentBuild, filePath),
    );
    const componentFiles = new Set(componentChanges);
    const scriptChanges = changedFiles.filter(
      (filePath) =>
        !componentFiles.has(filePath) && /\.(js|ts)$/.test(filePath),
    );
    const styleChanges = changedFiles.filter(
      (filePath) => !componentFiles.has(filePath) && /\.(css)$/.test(filePath),
    );
    const hasComponentChanges = componentChanges.length > 0;
    const hasScriptChanges = scriptChanges.length > 0;
    let nextCodeComponentBuild: CodeComponentBuildResult | undefined;

    if (hasScriptChanges) {
      logger.info("File change detected, rebuilding...");
      await buildDev(config);
    }

    if (hasComponentChanges && codeComponentBuilder) {
      logger.info("Code Component change detected, rebuilding...");
      nextCodeComponentBuild = await codeComponentBuilder.build();
    }

    if (hasScriptChanges || hasComponentChanges) {
      if (nextCodeComponentBuild) {
        codeComponentBuild = nextCodeComponentBuild;
        watcher.add(
          getAdditionalWatchFiles(
            config.devServer.watchList,
            nextCodeComponentBuild.inputFiles,
          ),
        );
        logCodeComponentBuild(nextCodeComponentBuild);
      }

      return "script";
    }

    if (styleChanges.length > 0) {
      logger.info("CSS change detected, reloading stylesheets...");
      return "styles";
    }
  }

  async function runWatcherBuilds(): Promise<void> {
    if (watcherBuildRunning) return;

    watcherBuildRunning = true;

    let reloadType: "script" | "styles" | undefined;

    try {
      while (pendingWatcherChanges.size > 0) {
        const changedFiles = [...pendingWatcherChanges.values()];

        pendingWatcherChanges.clear();
        const nextReloadType = await processWatcherChanges(changedFiles);

        if (nextReloadType === "script") {
          reloadType = "script";
        } else if (nextReloadType === "styles" && !reloadType) {
          reloadType = "styles";
        }
      }

      if (reloadType === "script") {
        reloadEmitter.emit("script-change", config.build.modules);
      } else if (reloadType === "styles") {
        reloadEmitter.emit("styles-change", config.build.modules);
      }
    } catch (error) {
      logger.error("Failed to rebuild changed files:", error);
    } finally {
      watcherBuildRunning = false;

      if (pendingWatcherChanges.size > 0 && !watcherBatchTimer) {
        watcherBatchTimer = setTimeout(flushWatcherChanges, 50);
      }
    }
  }

  function flushWatcherChanges(): void {
    watcherBatchTimer = undefined;
    void runWatcherBuilds();
  }

  watcher.on("all", (_, filePath) => {
    const normalizedFilePath = path.resolve(filePath);
    const watcherChangeKey =
      process.platform === "win32"
        ? normalizedFilePath.toLowerCase()
        : normalizedFilePath;

    pendingWatcherChanges.set(watcherChangeKey, filePath);

    if (watcherBatchTimer) clearTimeout(watcherBatchTimer);
    watcherBatchTimer = setTimeout(flushWatcherChanges, 50);
  });
}
