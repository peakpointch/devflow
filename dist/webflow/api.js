import { WebflowClient } from "webflow-api";
import { getEnvModules, getUniqueModules } from "../config/modules.js";
import { generateRegisterScripts, generateUpsertScripts } from "./scripts.js";
import logger from "../helpers/logger.js";
import { getIntegrationToken } from "../helpers/auth.js";
import { matchPages } from "../helpers/pageMatcher.js";
import { errorToString } from "../helpers/utils.js";
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
  dryRun = false
}) {
  const modules = getUniqueModules(config.environments);
  const allRequests = generateRegisterScripts(modules, config.repository);
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
  if (dryRun) {
    logger.debug(
      "Request list:",
      logger.json(missingRequests) + logger.newLine
    );
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
  dryRun
}) {
  const matchedPages = matchPages(pages, env.pages);
  const envModules = getEnvModules(env);
  const upsertScriptsRequest = generateUpsertScripts(
    envModules,
    scripts,
    config.repository
  );
  logger.info(
    `Publishing ${logger.num(upsertScriptsRequest.length)} scripts to ${logger.num(matchedPages.length)} matched pages in ${logger.var(env.name)} environment.`
  );
  const logPages = matchedPages.map((page) => ({
    title: page.title ?? "unknown",
    seoTitle: page.seo?.title ?? "unknown",
    publishedPath: page.publishedPath
  }));
  if (dryRun) {
    logger.debug("Matched pages:", logger.json(logPages) + logger.newLine);
    logger.debug("Scripts to upsert:", logger.json(upsertScriptsRequest));
  }
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
}
export {
  fetchCodeBlocks,
  fetchPages,
  fetchScripts,
  getWebflowClient,
  publishEnvironment,
  registerMissingScripts
};
