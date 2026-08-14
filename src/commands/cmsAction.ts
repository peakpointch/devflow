import chalk from "chalk";

import { parseConfigAction } from "../config/parse.js";
import { getWebflowConfig } from "../webflow/config.js";
import {} from "../webflow/api.js";
import { cmsLogger } from "../helpers/taskLogger.js";
import { errorToString } from "../helpers/utils.js";
import { OptionJSON, OptionVerbose } from "../types/cli.js";
import { Table } from "../helpers/table.js";
import { Webflow } from "webflow-api";

export function cmsListAction(): void {
  cmsLogger.error("This command has not been implemented yet.");
  process.exit(1);
}

export function cmsPayloadAction(): void {
  cmsLogger.error("This command has not been implemented yet.");
  process.exit(1);
}
