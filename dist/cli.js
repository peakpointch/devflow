#! /usr/bin/env node
import { Command } from "commander";
import { initAction } from "./commands/initAction.js";
import { configAction } from "./commands/configAction.js";
import { devAction } from "./commands/devAction.js";
import { buildAction } from "./commands/buildAction.js";
const program = new Command();
program.name("peakflow").description("PeakFlow CLI tool for project management").version("1.0.0");
program.command("init").description("Create a new project from the official template").argument("<project-name>", "Name of the project folder").action(initAction);
program.command("config").description("Create a peakflow.config.ts file").action(configAction);
program.command("dev").description("Start the development server").action(devAction);
program.command("build").description("Build the production bundle").action(buildAction);
program.command("wistia").description("Get binary video urls from wistia").argument("<media-id>", "Identifier of the wistia asset").action(wistiaAction);
program.parse(process.argv);
