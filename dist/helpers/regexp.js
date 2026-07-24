function anchorRegExp(pattern, type = "full") {
  const start = ["start", "full"].includes(type) ? "^" : "";
  const end = ["end", "full"].includes(type) ? "$" : "";
  return new RegExp(`${start}${pattern.source}${end}`);
}
function escapeRegExp(value) {
  if (typeof value !== "string") {
    throw new TypeError("Expected a string");
  }
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "\\x2d");
}
function strToRegExp(str) {
  return new RegExp(escapeRegExp(str));
}
function joinRegExp(parts, flags) {
  return new RegExp(
    parts.reduce(
      (pattern, part) => pattern + (part instanceof RegExp ? part.source : part),
      ""
    ),
    flags
  );
}
function globToRegExp(pattern) {
  let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "<!DOUBLESTAR!>").replace(/\*/g, "[^/]*").replace(/<!DOUBLESTAR!>/g, ".*").replace(/\?/g, "[^/]");
  return new RegExp(`^${regexPattern}$`);
}
export {
  anchorRegExp,
  escapeRegExp,
  globToRegExp,
  joinRegExp,
  strToRegExp
};
