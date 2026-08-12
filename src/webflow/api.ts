import chalk from "chalk";

import { PeakflowConfig, PeakflowEnv } from "peakflow/config";
import { Webflow, WebflowClient } from "webflow-api";

import { getUniqueModules } from "../config/modules.js";
import { generateRegisterScripts, generateUpsertScripts } from "./scripts.js";
import { logger } from "../helpers/taskLogger.js";
import { getIntegrationToken } from "../helpers/auth.js";
import { matchPages } from "../helpers/pageMatcher.js";
import { errorToString } from "../helpers/utils.js";
import type { WebflowConfig } from "../types/webflow.js";
import { OptionDryRun, OptionJSON, OptionVerbose } from "../types/cli.js";
import { Table } from "../helpers/table.js";

export function getWebflowClient(): WebflowClient {
  try {
    const token = getIntegrationToken("webflow");
    return new WebflowClient({
      accessToken: token,
    });
  } catch (err: any) {
    logger.error(err?.message ?? err);
    process.exit(1);
  }
}

export async function fetchPages(client: WebflowClient, siteId: string) {
  let pages: Webflow.PageList;

  try {
    pages = await client.pages.list(siteId);
  } catch (err) {
    logger.error("Failed to fetch pages:", errorToString(err));
    process.exit(1);
  }

  if (pages.pagination && pages.pagination.limit! < pages.pagination.total!) {
    throw new Error("Page limit exceeded");
  }

  return pages.pages ?? [];
}

export async function fetchScripts(client: WebflowClient, siteId: string) {
  let registeredScripts: Webflow.RegisteredScriptList;
  try {
    registeredScripts = await client.scripts.list(siteId);
  } catch (err) {
    logger.error("Failed to fetch registered scripts:", errorToString(err));
    process.exit(1);
  }

  if (
    registeredScripts.pagination &&
    registeredScripts.pagination.limit! < registeredScripts.pagination.total!
  ) {
    throw new Error("Scripts limit exceeded");
  }

  return registeredScripts.registeredScripts ?? [];
}

export async function fetchCodeBlocks(client: WebflowClient, siteId: string) {
  let blocks: Webflow.ListCustomCodeBlocks;

  try {
    blocks = await client.sites.scripts.listCustomCodeBlocks(siteId);
  } catch (err) {
    logger.error("Failed to fetch custom code blocks:", errorToString(err));
    process.exit(1);
  }

  if (
    blocks.pagination &&
    blocks.pagination.limit! < blocks.pagination.total!
  ) {
    throw new Error("Custom code block limit exceeded");
  }

  return blocks.blocks ?? [];
}

export type RegisterMissingScriptsParams = {
  /**
   * The registered scripts Webflow API response
   */
  scripts: Webflow.CustomCodeHostedResponse[];
  /**
   * The project's peakflow config
   */
  config: PeakflowConfig;
  /**
   * The Webflow API client
   */
  client: WebflowClient;
  /**
   * The project's webflow.json config
   */
  wfConfig: WebflowConfig;
} & OptionDryRun &
  OptionJSON &
  OptionVerbose;

/**
 * Register all the misssing scripts, that were not registered yet.
 */
export async function registerMissingScripts({
  scripts,
  config,
  client,
  wfConfig,
  dryRun = false,
  json = false,
  verbose = false,
}: RegisterMissingScriptsParams): Promise<
  Map<string, Webflow.CustomCodeHostedResponse>
> {
  const modules = getUniqueModules(config.environments);
  const allRequests = generateRegisterScripts(modules, config.repository);

  const scriptsByHash = new Map(
    scripts.map((script) => [script.integrityHash, script]),
  );

  const scriptsToPublish: Map<string, Webflow.CustomCodeHostedResponse> =
    new Map();

  const missingRequests: Webflow.CustomCodeHostedRequest[] = [];

  for (const request of allRequests) {
    const existing = scriptsByHash.get(request.integrityHash);

    if (existing?.integrityHash) {
      scriptsToPublish.set(existing.integrityHash, existing);
    } else {
      missingRequests.push(request);
    }
  }

  logger.info(
    `Found ${logger.num(missingRequests.length)} new scripts to register.`,
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
          formatTitle: (cell) => chalk.bold(cell),
        },
        {
          id: "Version",
          getValue: (row) => row.version,
          format: (cell) => chalk.dim(cell),
          formatTitle: (cell) => chalk.bold(cell),
        },
        {
          id: "URL",
          getValue: (row) => row.hostedLocation,
          format: (cell) => cell,
          formatTitle: (cell) => chalk.bold(cell),
        },
      ]);

      logger.continue(
        table.toString({
          titleRow: true,
          prefix: logger.indent + " ",
          rowCount: true,
        }),
      );
    }
  }

  if (dryRun) {
    return scriptsToPublish;
  }

  const newScripts = await Promise.all(
    missingRequests.map((req) => {
      return client.scripts.registerHosted(wfConfig.siteId, req);
    }),
  );

  for (const script of newScripts) {
    if (!script.integrityHash) {
      throw new Error(
        `Failed to register hosted script: missing integrity hash`,
      );
    }

    scriptsToPublish.set(script.integrityHash, script);
  }

  return scriptsToPublish;
}

export type PublishEnvironmentParams = {
  /**
   * The environment to publish
   */
  env: PeakflowEnv;
  /**
   * The project's peakflow config
   */
  config: PeakflowConfig;
  /**
   * The Webflow API client
   */
  client: WebflowClient;
  /**
   * Pages of the current webflow site
   */
  pages: Webflow.Page[];
  /**
   * All scripts to publish
   */
  scripts: Map<string, Webflow.CustomCodeHostedResponse>;
} & OptionDryRun &
  OptionJSON &
  OptionVerbose;

export async function publishEnvironment({
  env,
  config,
  client,
  pages,
  scripts,
  dryRun = false,
  verbose = false,
  json = false,
}: PublishEnvironmentParams) {
  if (env.skip) {
    logger.info(`Skipping disabled environment: ${logger.var(env.name)}`);
    return;
  }

  const matchedPages = matchPages(pages, env.pages);
  const upsertScriptsRequest = generateUpsertScripts({
    modules: env.modules,
    scriptsByHash: scripts,
    repo: config.repository,
    dryRun: dryRun,
  });

  if (!upsertScriptsRequest.length) {
    logger.info(
      `Skipping ${logger.var(env.name)} environment due to ${logger.num(upsertScriptsRequest.length)} scripts.`,
    );
    return;
  }

  if (!matchedPages.length) {
    logger.info(
      `Skipping ${logger.var(env.name)} environment due to ${logger.num(matchedPages.length)} matched pages.`,
    );
    return;
  }

  logger.info(
    `Found ${logger.num(upsertScriptsRequest.length)} scripts to ${logger.num(matchedPages.length)} matched pages in ${logger.var(env.name)} environment.`,
  );

  if (json) {
    logger.info(
      "Matched pages:",
      logger.json(
        matchedPages.map((page) => ({
          title: page.title,
          seoTitle: page.seo?.title,
          publishedPath: page.publishedPath,
        })),
      ),
    );
    logger.info("Scripts to upsert:", logger.json(upsertScriptsRequest));
  } else if (verbose) {
    const pageTable = new Table(matchedPages, [
      {
        id: "Title",
        align: "left",
        getValue: (page) => page.title ?? "Unknown",
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "Published Path",
        align: "left",
        getValue: (page) => page.publishedPath ?? "unknown",
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
    ]);

    const upsertTable = new Table(upsertScriptsRequest, [
      {
        id: "ID",
        getValue: (row) => row.id,
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "Version",
        getValue: (row) => row.version,
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "Location",
        getValue: (row) => row.location,
        formatTitle: (cell) => chalk.bold(cell),
      },
    ]);

    logger.continue(logger.indent, "Matched pages:");
    logger.continue(
      pageTable.toString({
        titleRow: true,
        prefix: logger.indent + " ",
        rowCount: true,
      }),
      logger.newLine,
    );

    logger.continue(logger.indent, "Scripts to upsert:");
    logger.continue(
      upsertTable.toString({
        titleRow: true,
        prefix: logger.indent + " ",
        rowCount: true,
      }),
      logger.newLine,
    );
  }

  if (dryRun) return;

  await Promise.all(
    matchedPages.map((page) =>
      /**
       * This endpoint is NOT additive. It replaces all the current
       * scripts on the page with the scripts in the submitted list.
       * Thus, there is no need to delete all the scripts manually
       * first.
       */
      client.pages.scripts.upsertCustomCode(page.id, {
        scripts: upsertScriptsRequest,
      }),
    ),
  );

  logger.success(`Successfully published ${logger.var(env.name)} environment.`);
}
