import chokidar from "chokidar";
import events from "events";
import { devLogger as logger } from "../helpers/taskLogger.js";
import { parseConfigAction } from "../config/parse.js";
import { buildDev } from "../build.js";
import { startWebflowProxy } from "../server.js";
async function devAction({ componentModuleId } = {}) {
  const config = await parseConfigAction();
  const reloadEmitter = new events.EventEmitter();
  logger.info("Read the docs at https://github.com/peakpointch/peakflow-cli");
  await buildDev(config);
  startWebflowProxy(config, reloadEmitter, componentModuleId);
  reloadEmitter.emit("script-change", config.build.modules);
  const watcher = chokidar.watch(config.devServer.watchList, {
    ignoreInitial: true
  });
  watcher.on("all", async (_, filePath) => {
    if (/\.(js|ts)$/.test(filePath)) {
      logger.info("File change detected, rebuilding...");
      await buildDev(config);
      reloadEmitter.emit("script-change", config.build.modules);
    } else if (/\.(css)$/.test(filePath)) {
      logger.info("CSS change detected, reloading stylesheets...");
      reloadEmitter.emit("styles-change", config.build.modules);
    }
  });
}
export {
  devAction
};
