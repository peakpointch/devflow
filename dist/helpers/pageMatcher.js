import { globToRegExp } from "./regexp.js";
function matchesGlob(pagePath, pattern) {
  const regex = globToRegExp(pattern);
  return regex.test(pagePath);
}
function matchPages(pages, patterns) {
  return pages.filter(
    (page) => patterns.some((pattern) => matchesGlob(page.publishedPath ?? "", pattern))
  );
}
export {
  matchPages,
  matchesGlob
};
