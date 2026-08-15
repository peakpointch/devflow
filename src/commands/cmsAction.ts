import chalk from "chalk";
import type { Webflow } from "webflow-api";

import { getWebflowConfig } from "../webflow/config.js";
import {
  getWebflowClient,
  fetchCollections,
  fetchCollectionDetails,
} from "../webflow/api.js";
import { Table } from "../helpers/table.js";
import { cmsLogger as logger } from "../helpers/taskLogger.js";
import { html, json } from "../helpers/syntax.js";
import { pluralize, toCamelCase } from "../helpers/utils.js";
import type { OptionJSON, OptionVerbose } from "../types/cli.js";

export type CMSListOptions = OptionJSON & OptionVerbose;

export async function cmsListAction({ json }: CMSListOptions): Promise<void> {
  const client = getWebflowClient();
  const wfConfig = getWebflowConfig();

  logger.info("Fetching collections...");

  const collections = await fetchCollections(client, wfConfig.siteId);

  logger.info(
    `Found ${logger.num(collections.length)} collections in site ${logger.var(wfConfig.siteId)}.`,
  );

  if (json) {
    logger.continue(logger.json(collections));
  } else {
    const table = new Table(collections, [
      {
        id: "name",
        title: "Name",
        getValue: (collection) => collection.displayName ?? "",
        format: (cell) => logger.var(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "slug",
        title: "Slug",
        getValue: (collection) => collection.slug ?? "",
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "id",
        title: "ID",
        getValue: (collection) => collection.id,
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "updated",
        title: "Last Updated",
        getValue: (collection) =>
          collection.lastUpdated?.toLocaleString() ?? "",
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
    ]);

    logger.continue(
      table.toString({
        titleRow: true,
        rowCount: true,
        prefix: logger.indent + " ",
      }),
    );
  }
}

export type CMSPayloadOptions = {};

export async function cmsPayloadAction(
  slug: string,
  {}: CMSPayloadOptions,
): Promise<void> {
  const client = getWebflowClient();
  const wfConfig = getWebflowConfig();

  logger.info("Fetching collections...");

  const collections = await fetchCollections(client, wfConfig.siteId);
  const collectionId = collections.find((item) => item.slug === slug)?.id;

  if (!collectionId) {
    logger.error(
      `Invalid collection slug ${logger.var(slug)}. Use ${logger.var("peakflow cms list")} to see all valid collection slugs.`,
    );
    process.exit(1);
  }

  logger.success(`Found collection with slug ${logger.var(slug)}.`);
  logger.info("Fetching collection details...");

  const collection = await fetchCollectionDetails(client, collectionId);

  const { payload, skippedTypes } = generatePayload(collection);

  if (skippedTypes.size) {
    const entries = Array.from(skippedTypes.entries());
    const count = entries.reduce((sum, [, fields]) => sum + fields.length, 0);

    const skippedTable = new Table(entries, [
      {
        id: "type",
        title: "Type",
        getValue: (row) => row[0],
        format: (cell) => logger.var(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
      {
        id: "fields",
        title: "Fields",
        getValue: (row) => row[1].join(", "),
        format: (cell) => chalk.dim(cell),
        formatTitle: (cell) => chalk.bold(cell),
      },
    ]);

    logger.warn(`Skipped ${count} unsupported ${pluralize("field", count)}`);
    logger.continue(
      skippedTable.toString({
        titleRow: true,
        prefix: logger.indent + " ",
        rowCount: true,
      }),
      logger.newLine,
    );
  }
  logger.success("Payload generated:", logger.newLine);
  logger.continue(payload);
}

function formatWebflowField(field: Webflow.Field): string {
  let slugProperty = "";
  if (field.type === "Reference") {
    slugProperty = "/Slug";
  }
  return chalk.magenta(`{{wf:${field.displayName}${slugProperty}|Dynamo}}`);
}

function generatePayload(collection: Webflow.Collection) {
  let payloadLines = [
    html.topen("script"),
    html.attr("type", "application/json"),
    html.attr("data-payload-element", "embed"),
    html.attr("data-cms-id", collection.slug!),
    html.tend,
    logger.newLine,
    json.indent(1),
    json.objStart,
    logger.newLine,
  ];

  const skippedTypes = new Map<Webflow.FieldType, string[]>();

  for (let i = 0; i < collection.fields.length; i++) {
    const field = collection.fields[i]!;
    const skipTypes: Webflow.FieldType[] = [
      "MultiImage",
      "MultiReference",
      "RichText",
    ];
    const noQuoteTypes: Webflow.FieldType[] = ["Switch", "Number"];

    if (skipTypes.includes(field.type)) {
      const names = skippedTypes.get(field.type) ?? [];
      names.push(field.displayName);
      skippedTypes.set(field.type, names);
      continue;
    }

    const key =
      field.type === "Reference" ? `${field.displayName}Id` : field.displayName;

    const line = [json.indent(2), json.str(toCamelCase(key)), json.assign];

    if (noQuoteTypes.includes(field.type)) {
      // This field should have no quotes in the json
      line.push(formatWebflowField(field));
    } else {
      line.push(json.str(formatWebflowField(field)));
    }

    if (i < collection.fields.length - 1) {
      line.push(json.sep);
    }

    line.push(logger.newLine);
    payloadLines.push(line.join(""));
  }

  payloadLines.push(json.objEnd, logger.newLine, html.tclose("script"));

  return { payload: payloadLines.join(""), skippedTypes };
}
