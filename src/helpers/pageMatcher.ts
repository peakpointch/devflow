import { globToRegExp } from "./regexp.js";
import { Webflow } from "webflow-api";

/**
 * Check if a page path matches a glob pattern
 */
export function matchesGlob(pagePath: string, pattern: string): boolean {
  const regex = globToRegExp(pattern);
  return regex.test(pagePath);
}

/**
 * Find all pages matching a list of glob patterns
 */
export function matchPages(
  pages: Webflow.Page[],
  patterns: string[],
): Webflow.Page[] {
  return pages.filter((page) =>
    patterns.some((pattern) => matchesGlob(page.publishedPath ?? "", pattern)),
  );
}
