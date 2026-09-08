#! /usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import { initialize } from "./helpers/initialize.js";
import { initAction } from "./commands/initAction.js";
import { configAction } from "./commands/configAction.js";
import { devAction } from "./commands/devAction.js";
import { buildAction } from "./commands/buildAction.js";
import { wistiaAction } from "./commands/wistiaAction.js";
import {
  authLoginAction,
  authLogoutAction,
  authStatusAction
} from "./commands/authAction.js";
import { cmsListAction, cmsPayloadAction } from "./commands/cmsAction.js";
import {
  codeListAction,
  codePublishAction,
  codeUnpublishAction
} from "./commands/codeAction.js";
import { normalizeDevBaseUrl } from "./helpers/devUrl.js";
initialize();
const program = new Command();
const auth = program.command("auth").description("Manage authentication");
const cms = program.command("cms").description("CMS related commands");
const code = program.command("code").description("Manage Webflow custom code");
program.name("peakflow").description("Manage your Webflow custom code projects.").version("0.1.0");
program.command("init").description("Create a new project from the official template").argument("<project-name>", "Name of the project folder").action(initAction);
program.command("config").description("Create a peakflow.config.ts file").action(configAction);
program.command("dev").description("Start the development server").option(
  "--component-module-id <id>",
  "Published Webflow Code Component module ID"
).option(
  "--relative-urls",
  "Use root-relative URLs for local development assets"
).addOption(
  new Option(
    "--base-url <url>",
    "Use an HTTP(S) origin for local development assets"
  ).argParser((baseUrl) => {
    try {
      return normalizeDevBaseUrl(baseUrl);
    } catch {
      throw new InvalidArgumentError("must be an absolute HTTP(S) origin");
    }
  }).conflicts("relativeUrls")
).action(devAction);
program.command("build").description("Build the production bundle").action(buildAction);
auth.command("login").description("Log in and store credentials").action(authLoginAction);
auth.command("logout").description("Log out and remove stored credentials").action(authLogoutAction);
auth.command("status").description("Show current authentication status").action(authStatusAction);
cms.command("list").description("List collections of you Webflow site").action(cmsListAction);
cms.command("payload").description("Generate the JSON payload for a webflow collection").argument("<slug>", "Slug of the collection").option("--force-quotes", "Forces quotes on all field types").action(cmsPayloadAction);
code.command("publish").description("Publish custom code modules to your Webflow site").option("--dry-run", "Preview changes without publishing them").option("--json", "Output as JSON").option("--verbose", "Output all available information").action(codePublishAction);
code.command("unpublish").description("Unpublish all custom code modules from your Webflow site").action(codeUnpublishAction);
code.command("list").description("List all published custom code modules").option("--json", "Output as JSON").option("--verbose", "Output all available information").action(codeListAction);
program.command("wistia").description("Get binary video urls from wistia").argument("<media-id>", "Identifier of the wistia asset").action(wistiaAction);
program.parse(process.argv);
