import { describe, expect, test } from "@jest/globals";

import { Webflow } from "webflow-api";
import { matchPages, matchesGlob } from "../src/helpers/pageMatcher.js";

describe(matchesGlob.name, () => {
  test("matches an exact pathname", () => {
    expect(matchesGlob("/", "/")).toBe(true);
    expect(matchesGlob("/about", "/about")).toBe(true);
  });

  test("does not partially match an exact pathname", () => {
    expect(matchesGlob("/about/team", "/about")).toBe(false);
  });

  test("/* does not match the root page", () => {
    expect(matchesGlob("/", "/*")).toBe(false);
  });

  test("/**/* does not match the root page", () => {
    expect(matchesGlob("/", "/**/*")).toBe(false);
  });

  test("matches pages recursively", () => {
    expect(matchesGlob("/admin/users", "/admin/**/*")).toBe(true);
    expect(matchesGlob("/admin/users/123", "/admin/**/*")).toBe(true);
    expect(matchesGlob("/admin/a/b/c/d/e", "/admin/**/*")).toBe(true);
  });

  test("supports extglobs", () => {
    expect(matchesGlob("/website/users", "/!(admin|screen)/**/*")).toBe(true);

    expect(matchesGlob("/admin/users", "/!(admin|screen)/**/*")).toBe(false);
    expect(matchesGlob("/screen/dashboard", "/!(admin|screen)/**/*")).toBe(
      false,
    );
  });
});

describe(matchPages.name, () => {
  function page(path: string | null): Webflow.Page {
    return {
      publishedPath: path,
    } as Webflow.Page;
  }

  function paths(pages: Webflow.Page[]): (string | null | undefined)[] {
    return pages.map((page) => page.publishedPath);
  }

  test("matches an exact page", () => {
    const pages = [page("/"), page("/about"), page("/contact")];

    expect(paths(matchPages(pages, ["/about"]))).toEqual(["/about"]);
  });

  test("matches multiple include patterns", () => {
    const pages = [
      page("/"),
      page("/about"),
      page("/contact"),
      page("/admin/users"),
    ];

    expect(paths(matchPages(pages, ["/about", "/contact"]))).toEqual([
      "/about",
      "/contact",
    ]);
  });

  test("exclusions override inclusions", () => {
    const pages = [
      page("/"),
      page("/about"),
      page("/admin/users"),
      page("/admin/settings/general"),
      page("/screen/dashboard"),
    ];

    expect(
      paths(
        matchPages(pages, [
          "/",
          "/*",
          "/**/*",
          "!/admin/**/*",
          "!/screen/**/*",
        ]),
      ),
    ).toEqual(["/", "/about"]);
  });

  test("supports exclusion-only patterns", () => {
    const pages = [
      page("/"),
      page("/about"),
      page("/admin/users"),
      page("/admin/settings"),
    ];

    expect(paths(matchPages(pages, ["!/admin/**/*"]))).toEqual(["/", "/about"]);
  });

  test("supports extglobs within include patterns", () => {
    const pages = [
      page("/website/users"),
      page("/news/articles/post"),
      page("/admin/users"),
      page("/screen/dashboard"),
    ];

    expect(paths(matchPages(pages, ["/!(admin|screen)/**/*"]))).toEqual([
      "/website/users",
      "/news/articles/post",
    ]);
  });

  describe("Sanavita configuration", () => {
    const pages = [
      page("/"),
      page("/ueber-uns"),
      page("/kontakt"),
      page("/team/pflege"),
      page("/anmeldung-wohnen-mit-service"),
      page("/admin/users"),
      page("/admin/settings/general"),
      page("/screen/dashboard"),
      page("/screen/menus/today"),
    ];

    test("matches the website environment", () => {
      expect(
        paths(
          matchPages(pages, [
            "/",
            "/*",
            "/**/*",
            "!/admin/**/*",
            "!/screen/**/*",
            "!/anmeldung-wohnen-mit-service",
          ]),
        ),
      ).toEqual(["/", "/ueber-uns", "/kontakt", "/team/pflege"]);
    });

    test("matches the forms environment", () => {
      expect(
        paths(matchPages(pages, ["/anmeldung-wohnen-mit-service"])),
      ).toEqual(["/anmeldung-wohnen-mit-service"]);
    });

    test("matches the admin environment", () => {
      expect(paths(matchPages(pages, ["/admin/**/*"]))).toEqual([
        "/admin/users",
        "/admin/settings/general",
      ]);
    });

    test("matches the screen environment", () => {
      expect(paths(matchPages(pages, ["/screen/**/*"]))).toEqual([
        "/screen/dashboard",
        "/screen/menus/today",
      ]);
    });
  });

  test("does not match pages without a published path", () => {
    const pages = [page(null), page("/about")];

    expect(paths(matchPages(pages, ["/*"]))).toEqual(["/about"]);
  });
});
