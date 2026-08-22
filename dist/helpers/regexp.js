import picomatch from "picomatch";
function anchorRegExp(pattern, type = "full") {
  const start = ["start", "full"].includes(type) ? "^" : "";
  const end = ["end", "full"].includes(type) ? "$" : "";
  return new RegExp(`${start}${pattern.source}${end}`);
}
function groupRegExp(patterns, opts = {}) {
  const pattern = Array.isArray(patterns) ? joinRegExp(patterns) : patterns;
  const groupStart = opts.nonCapturing ? "(?:" : opts.name ? `(?<${opts.name}>` : "(";
  const groupEnd = opts.optional ? ")?" : ")";
  const flags = opts.flags ?? pattern.flags;
  return new RegExp(groupStart + pattern.source + groupEnd, flags);
}
function optionalRegExp(patterns, flags) {
  const pattern = Array.isArray(patterns) ? joinRegExp(patterns) : patterns;
  const groupStart = "(?:";
  const groupEnd = ")?";
  return new RegExp(
    groupStart + pattern.source + groupEnd,
    flags ?? pattern.flags
  );
}
function unionRegExp(patterns, flags) {
  const combinedPattern = patterns.map((part) => {
    const partStr = typeof part === "string" ? escapeRegExp(part) : part.source;
    return partStr ? `(?:${partStr})` : "";
  }).filter(Boolean).join("|");
  return new RegExp(combinedPattern, flags);
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
  return picomatch.makeRe(pattern, {
    dot: true
  });
}
export {
  anchorRegExp,
  escapeRegExp,
  globToRegExp,
  groupRegExp,
  joinRegExp,
  optionalRegExp,
  strToRegExp,
  unionRegExp
};
