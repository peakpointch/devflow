import chalk from "chalk";

export const html = {
  tend: chalk.dim(">"),
  assign: chalk.dim("="),
  quote: chalk.yellow(`"`),
  topen: (tagName: string) => chalk.dim("<") + chalk.cyan(tagName),
  tclose: (tagName: string) =>
    chalk.dim("</") + chalk.cyan(tagName) + html.tend,
  key: (str: string) => chalk.green(str),
  val: (str: string) => html.quote + chalk.yellow(str) + html.quote,
  attr: (key: string, val: string) =>
    " " + html.key(key) + html.assign + html.val(val),
};

export const json = {
  objStart: chalk.dim("{"),
  objEnd: chalk.dim("}"),
  assign: chalk.dim(": "),
  sep: chalk.dim(","),
  quote: chalk.yellow(`"`),
  indent: (count: number) => "  ".repeat(count),
  str: (str: string) => json.quote + chalk.yellow(str) + json.quote,
};
