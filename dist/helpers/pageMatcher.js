import { globToRegExp } from "./regexp.js";
function matchesGlob(pagePath, pattern) {
  const regex = globToRegExp(pattern);
  return regex.test(pagePath);
}
function matchPages(pages, patterns) {
  const included = patterns.filter(
    (pattern) => !pattern.startsWith("!") || pattern.startsWith("!(")
  );
  const excluded = patterns.filter(
    (pattern) => pattern.startsWith("!") && !pattern.startsWith("!(")
  );
  return pages.filter((page) => {
    const path = page.publishedPath ?? "";
    const isIncluded = included.length === 0 || included.some((pattern) => matchesGlob(path, pattern));
    const isExcluded = excluded.some(
      (pattern) => matchesGlob(path, pattern.slice(1))
    );
    return isIncluded && !isExcluded;
  });
}
export {
  matchPages,
  matchesGlob
};
