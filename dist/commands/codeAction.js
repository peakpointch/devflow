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
import { Table } from "../helpers/table.js";
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
    dryRun: options.dryRun,
    json: options.json,
    verbose: options.verbose
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
        dryRun: options.dryRun,
        json: options.json,
        verbose: options.verbose
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
  const pages = await fetchPages(client, wfConfig.siteId);
  const pagesById = pages.reduce((acc, page) => {
    acc[page.id] = page;
    return acc;
  }, {});
  const rows = blocks.flatMap((block) => {
    const path = block.type === "site" ? "[Global]" : pagesById[block.pageId ?? ""]?.publishedPath ?? "unknown";
    return (block.scripts ?? []).map((script) => ({
      path,
      script,
      file: script.attributes?.["data-peakflow-local"] ?? ""
    }));
  }).sort(
    (a, b) => a.script.id.localeCompare(b.script.id) || a.script.version.localeCompare(b.script.version) || a.path.localeCompare(b.path)
  );
  const table = new Table(rows, [
    {
      id: "page",
      title: "Page",
      getValue: (row) => row.path,
      format: (cell) => chalk.dim(cell),
      formatTitle: (cell) => chalk.bold(cell)
    },
    {
      id: "script",
      title: "Script",
      getValue: (row) => row.script.id,
      format: (cell) => logger.var(cell),
      formatTitle: (cell) => chalk.bold(cell)
    },
    {
      id: "version",
      title: "Version",
      getValue: (row) => row.script.version,
      format: (cell) => chalk.dim(cell),
      formatTitle: (cell) => chalk.bold(cell)
    },
    {
      id: "location",
      title: "Location",
      getValue: (row) => row.script.location,
      format: (cell) => chalk.dim(cell),
      formatTitle: (cell) => chalk.bold(cell)
    },
    {
      id: "file",
      title: "File",
      getValue: (row) => row.file,
      format: (cell) => chalk.dim(cell),
      formatTitle: (cell) => chalk.bold(cell)
    }
  ]);
  logger.logger.info(
    table.toString({
      titleRow: true,
      rowCount: true,
      prefix: "  "
    })
  );
}
export {
  codeListAction,
  codePublishAction,
  codeUnpublishAction
};
