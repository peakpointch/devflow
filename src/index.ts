#! /usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import buildServer from "./buildServer";
import { loadDevServer } from "./devServer";
import initConfig from "./initConfig";
import chalk from "chalk";

export const prefixX = `${chalk.bgMagenta(" xAtom ")} ⏩`;

yargs(hideBin(process.argv))
  .command(
    "dev [config]",
    "to start dev server",
    (yargs) => {
      return yargs.positional("config", {
        describe: "config file path",
        default: "xatom.json",
      });
    },
    (arg) => {
      loadDevServer(arg.config as string);
    },
  )
  .command(
    "build [config]",
    "build production bundle",
    (yargs) => {
      return yargs.positional("config", {
        describe: "config file path",
        default: "xatom.json",
      });
    },
    (arg) => {
      buildServer(arg.config as string);
    },
  )
  .command(
    "init [file]",
    "create xatom.json configuration file",
    (yargs) => {
      return yargs.positional("file", {
        describe: "config file name",
        default: "xatom.json",
      });
    },
    (arg) => {
      initConfig(arg.file as string);
    },
  )
  .help()
  .demandCommand()
  .recommendCommands()
  .parse();
