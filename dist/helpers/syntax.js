import chalk from "chalk";
const html = {
  tend: chalk.dim(">"),
  assign: chalk.dim("="),
  quote: chalk.yellow(`"`),
  topen: (tagName) => chalk.dim("<") + chalk.cyan(tagName),
  tclose: (tagName) => chalk.dim("</") + chalk.cyan(tagName) + html.tend,
  key: (str) => chalk.green(str),
  val: (str) => html.quote + chalk.yellow(str) + html.quote,
  attr: (key, val) => " " + html.key(key) + html.assign + html.val(val)
};
const json = {
  objStart: chalk.dim("{"),
  objEnd: chalk.dim("}"),
  assign: chalk.dim(": "),
  sep: chalk.dim(","),
  quote: chalk.yellow(`"`),
  indent: (count) => "  ".repeat(count),
  str: (str) => json.quote + chalk.yellow(str) + json.quote
};
export {
  html,
  json
};
