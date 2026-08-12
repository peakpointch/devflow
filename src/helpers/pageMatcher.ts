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
  const included = patterns.filter(
    (pattern) => !pattern.startsWith("!") || pattern.startsWith("!("),
  );
  const excluded = patterns.filter(
    (pattern) => pattern.startsWith("!") && !pattern.startsWith("!("),
  );

  return pages.filter((page) => {
    const path = page.publishedPath ?? "";

    // Reject archived or drafted pages
    if (page.archived === true || page.draft === true) {
      return false;
    }

    // Check collection templates
    if (page.collectionId) {
      const isPublished = Boolean(page.seo?.title);

      // Reject unpublished collection templates
      if (!isPublished) {
        return false;
      }
    }

    const isIncluded =
      included.length === 0 ||
      included.some((pattern) => matchesGlob(path, pattern));

    const isExcluded = excluded.some((pattern) =>
      matchesGlob(path, pattern.slice(1)),
    );

    return isIncluded && !isExcluded;
  });
}
