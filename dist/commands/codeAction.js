import chalk from "chalk";
import { parseConfigAction } from "../config/parse.js";
import { getWebflowConfig } from "../webflow/config.js";
import {
  fetchCodeBlocks,
  fetchPages,
  fetchScripts,
  getWebflowClient,
  registerMissingScripts,
  publishEnvironment
} from "../webflow/api.js";
import { logger } from "../helpers/taskLogger.js";
import { errorToString } from "../helpers/utils.js";
async function codePublishAction(options = {}) {
  logger.setScope("Publish");
  if (options.dryRun) {
    logger.setLevel("debug");
  }
  const client = getWebflowClient();
  const config = await parseConfigAction();
  const wfConfig = getWebflowConfig();
  logger.setScope("Publish");
  const registeredScripts = await fetchScripts(client, wfConfig.siteId);
  const scripts = await registerMissingScripts({
    client,
    config,
    wfConfig,
    scripts: registeredScripts,
    dryRun: options.dryRun ?? false
  });
  const pages = await fetchPages(client, wfConfig.siteId);
  await Promise.all(
    config.environments.map(
      (env) => publishEnvironment({
        client,
        config,
        env,
        pages,
        scripts,
        dryRun: options.dryRun ?? false
      })
    )
  );
}
async function codeUnpublishAction() {
  logger.setScope("Unpublish");
  const client = getWebflowClient();
  const wfConfig = getWebflowConfig();
  logger.setScope("Unpublish");
  const blocks = await fetchCodeBlocks(client, wfConfig.siteId);
  try {
    const promises = [];
    let count = 0;
    for (const block of blocks) {
      if (block.type === "site") {
        promises.push(client.sites.scripts.deleteCustomCode(block.siteId));
      } else {
        promises.push(client.pages.scripts.deleteCustomCode(block.pageId));
      }
      count += block.scripts?.length ?? 0;
    }
    await Promise.all(promises);
    logger.info(
      `Removed ${logger.num(count)} custom code blocks from site ${logger.var(wfConfig.siteId)}.`
    );
  } catch (err) {
    logger.error(errorToString(err));
  }
}
async function codeListAction({ json, verbose }) {
  logger.setScope("Code List");
  const client = getWebflowClient();
  const wfConfig = getWebflowConfig();
  logger.setScope("Code List");
  const blocks = await fetchCodeBlocks(client, wfConfig.siteId);
  logger.info(
    `Found ${logger.num(blocks.length)} custom code blocks in site ${logger.var(wfConfig.siteId)}.`
  );
  if (!blocks.length) return;
  logger.logger.info();
  if (json) {
    logger.logger.info(logger.json(blocks));
    return;
  }
  for (const block of blocks) {
    const target = block.type === "site" ? chalk.bold("Site") : `${chalk.bold("Page")} ${chalk.dim(block.pageId ?? "unknown")}`;
    logger.logger.info(target);
    if (!block.scripts?.length) {
      logger.logger.info(chalk.dim("  No scripts") + logger.newLine);
      continue;
    }
    for (const script of block.scripts) {
      logger.logger.info(
        // @ts-expect-error wrong webflow typing
        `  ${logger.var(script.displayName ?? script.id)}`,
        chalk.dim(script.version),
        chalk.dim(script.location)
      );
      if (!verbose) continue;
      for (const [name, value] of Object.entries(script.attributes ?? {})) {
        logger.logger.info(`    ${chalk.dim(`${name}:`)} ${value}`);
      }
    }
    logger.logger.info();
  }
}
export {
  codeListAction,
  codePublishAction,
  codeUnpublishAction
};
