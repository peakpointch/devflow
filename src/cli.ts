#! /usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import builder from "./builder";
import devflow from "./devflow";
import initConfig from "./initialize";
import chalk from "chalk";

export const prefixX = `${chalk.bgMagenta(" xAtom ")} ⏩`;
const configFileName = "devflow.json";

yargs(hideBin(process.argv))
  .command(
    "dev [config]",
    "to start dev server",
    (yargs) => {
      return yargs.positional("config", {
        describe: "config file path",
        default: configFileName,
      });
    },
    (arg) => {
      devflow(arg.config as string);
    },
  )
  .command(
    "build [config]",
    "build production bundle",
    (yargs) => {
      return yargs.positional("config", {
        describe: "config file path",
        default: configFileName,
      });
    },
    (arg) => {
      builder(arg.config as string);
    },
  )
  .command(
    "init [file]",
    "create devflow.json configuration file",
    (yargs) => {
      return yargs.positional("file", {
        describe: "config file name",
        default: configFileName,
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
