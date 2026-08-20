import chalk from "chalk";
import { WebflowClient } from "webflow-api";
import { getUniqueModules } from "../config/modules.js";
import { generateRegisterScripts, generateUpsertScripts } from "./scripts.js";
import { logger } from "../helpers/taskLogger.js";
import { getIntegrationToken } from "../helpers/auth.js";
import { matchPages } from "../helpers/pageMatcher.js";
import { errorToString } from "../helpers/utils.js";
import { Table } from "../helpers/table.js";
function getWebflowClient() {
  try {
    const token = getIntegrationToken("webflow");
    return new WebflowClient({
      accessToken: token
    });
  } catch (err) {
    logger.error(err?.message ?? err);
    process.exit(1);
  }
}
async function fetchCollections(client, siteId) {
  let collections;
  try {
    collections = await client.collections.list(siteId);
  } catch (err) {
    logger.error("Failed to fetch collections:", errorToString(err));
    process.exit(1);
  }
  return collections.collections ?? [];
}
async function fetchCollectionDetails(client, collectionId) {
  let collection;
  try {
    collection = await client.collections.get(collectionId);
  } catch (err) {
    logger.error("Failed to fetch collection details:", errorToString(err));
    process.exit(1);
  }
  return collection ?? [];
}
async function fetchPages(client, siteId) {
  let pages;
  try {
    pages = await client.pages.list(siteId);
  } catch (err) {
    logger.error("Failed to fetch pages:", errorToString(err));
    process.exit(1);
  }
  if (pages.pagination && pages.pagination.limit < pages.pagination.total) {
    throw new Error("Page limit exceeded");
  }
  return pages.pages ?? [];
}
async function fetchScripts(client, siteId) {
  let registeredScripts;
  try {
    registeredScripts = await client.scripts.list(siteId);
  } catch (err) {
    logger.error("Failed to fetch registered scripts:", errorToString(err));
    process.exit(1);
  }
  if (registeredScripts.pagination && registeredScripts.pagination.limit < registeredScripts.pagination.total) {
    throw new Error("Scripts limit exceeded");
  }
  return registeredScripts.registeredScripts ?? [];
}
async function fetchCodeBlocks(client, siteId) {
  let blocks;
  try {
    blocks = await client.sites.scripts.listCustomCodeBlocks(siteId);
  } catch (err) {
    logger.error("Failed to fetch custom code blocks:", errorToString(err));
    process.exit(1);
  }
  if (blocks.pagination && blocks.pagination.limit < blocks.pagination.total) {
    throw new Error("Custom code block limit exceeded");
  }
  return blocks.blocks ?? [];
}
async function registerMissingScripts({
  scripts,
  config,
  client,
  wfConfig,
  dryRun = false,
  json = false,
  verbose = false
}) {
  const modules = getUniqueModules(config.environments);
  const allRequests = await generateRegisterScripts(modules, config.repository);
  const scriptsByHash = new Map(
    scripts.map((script) => [script.integrityHash, script])
  );
  const scriptsToPublish = /* @__PURE__ */ new Map();
  const missingRequests = [];
  for (const request of allRequests) {
    const existing = scriptsByHash.get(request.integrityHash);
    if (existing?.integrityHash) {
      scriptsToPublish.set(existing.integrityHash, existing);
    } else {
      missingRequests.push(request);
    }
  }
  logger.info(
    `Found ${logger.num(missingRequests.length)} new scripts to register.`
  );
  if (missingRequests.length) {
    if (json) {
      logger.info("Request list:", logger.json(missingRequests));
    } else if (verbose) {
      const table = new Table(missingRequests, [
        {
          id: "Script",
          getValue: (row) => row.displayName,
          format: (cell) => logger.var(cell),
          formatTitle: (cell) => chalk.bold(cell)
        },
        {
          id: "Version",
          getValue: (row) => row.version,
          format: (cell) => chalk.dim(cell),
          formatTitle: (cell) => chalk.bold(cell)
        },
        {
          id: "URL",
          getValue: (row) => row.hostedLocation,
          format: (cell) => cell,
          formatTitle: (cell) => chalk.bold(cell)
        }
      ]);
      logger.continue(
        table.toString({
          titleRow: true,
          prefix: logger.indent + " ",
          rowCount: true
        })
      );
    }
  }
  if (dryRun) {
    return scriptsToPublish;
  }
  const newScripts = await Promise.all(
    missingRequests.map((req) => {
      return client.scripts.registerHosted(wfConfig.siteId, req);
    })
  );
  for (const script of newScripts) {
    if (!script.integrityHash) {
      throw new Error(
        `Failed to register hosted script: missing integrity hash`
      );
    }
    scriptsToPublish.set(script.integrityHash, script);
  }
  return scriptsToPublish;
}
async function publishEnvironment({
  env,
  config,
  client,
  pages,
  scripts,
  dryRun = false,
  verbose = false,
  json = false
}) {
  if (env.skip) {
    logger.info(`Skipping disabled environment: ${logger.var(env.name)}`);
    return;
  }
  const matchedPages = matchPages(pages, env.pages);
  const upsertScriptsRequest = await generateUpsertScripts({
    modules: env.modules,
    scriptsByHash: scripts,
    repo: config.repository,
    dryRun
  });
  if (!upsertScriptsRequest.length) {
    logger.info(
      `Skipping ${logger.var(env.name)} environment due to ${logger.num(upsertScriptsRequest.length)} scripts.`
    );
    return;
  }
  if (!matchedPages.length) {
    logger.info(
      `Skipping ${logger.var(env.name)} environment due to ${logger.num(matchedPages.length)} matched pages.`
    );
    return;
  }
  logger.info(
    `Found ${logger.num(upsertScriptsRequest.length)} scripts to ${logger.num(matchedPages.length)} matched pages in ${logger.var(env.name)} environment.`
  );
  if (json) {
    logger.info(
      "Matched pages:",
      logger.json(
        matchedPages.map((page) => ({
          title: page.title,
          seoTitle: page.seo?.title,
          publishedPath: page.publishedPath
        }))
      )
    );
    logger.info("Scripts to upsert:", logger.json(upsertScriptsRequest));
  } else if (verbose) {
    const pageTable = new Table(matchedPages, [
      {
        id: "Title",
        align: "left",
        getValue: (page) => page.title ?? "Unknown",
        formatTitle: (cell) => chalk.bold(cell)
      },
      {
        id: "Published Path",
        align: "left",
        getValue: (page) => page.publishedPath ?? "unknown",
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell)
      }
    ]);
    const upsertTable = new Table(upsertScriptsRequest, [
      {
        id: "ID",
        getValue: (row) => row.id,
        formatTitle: (cell) => chalk.bold(cell)
      },
      {
        id: "Version",
        getValue: (row) => row.version,
        formatTitle: (cell) => chalk.bold(cell)
      },
      {
        id: "Location",
        getValue: (row) => row.location,
        formatTitle: (cell) => chalk.bold(cell)
      }
    ]);
    logger.continue(logger.indent, "Matched pages:");
    logger.continue(
      pageTable.toString({
        titleRow: true,
        prefix: logger.indent + " ",
        rowCount: true
      }),
      logger.newLine
    );
    logger.continue(logger.indent, "Scripts to upsert:");
    logger.continue(
      upsertTable.toString({
        titleRow: true,
        prefix: logger.indent + " ",
        rowCount: true
      }),
      logger.newLine
    );
  }
  if (dryRun) return;
  await Promise.all(
    matchedPages.map(
      (page) => (
        /**
         * This endpoint is NOT additive. It replaces all the current
         * scripts on the page with the scripts in the submitted list.
         * Thus, there is no need to delete all the scripts manually
         * first.
         */
        client.pages.scripts.upsertCustomCode(page.id, {
          scripts: upsertScriptsRequest
        })
      )
    )
  );
  logger.success(`Successfully published ${logger.var(env.name)} environment.`);
}
export {
  fetchCodeBlocks,
  fetchCollectionDetails,
  fetchCollections,
  fetchPages,
  fetchScripts,
  getWebflowClient,
  publishEnvironment,
  registerMissingScripts
};
