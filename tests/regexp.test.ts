import { describe, expect, test } from "@jest/globals";

import {
  anchorRegExp,
  escapeRegExp,
  joinRegExp,
  strToRegExp,
  globToRegExp,
} from "../src/helpers/regexp.js";

describe(anchorRegExp.name, () => {
  test("anchors to the full string by default", () => {
    const pattern = anchorRegExp(/foo/);

    expect(pattern.test("foo")).toBe(true);
    expect(pattern.test("foobar")).toBe(false);
    expect(pattern.test("barfoo")).toBe(false);
  });

  test("anchors only to the start", () => {
    const pattern = anchorRegExp(/foo/, "start");

    expect(pattern.test("foobar")).toBe(true);
    expect(pattern.test("barfoo")).toBe(false);
  });

  test("anchors only to the end", () => {
    const pattern = anchorRegExp(/foo/, "end");

    expect(pattern.test("barfoo")).toBe(true);
    expect(pattern.test("foobar")).toBe(false);
  });
});

describe(escapeRegExp.name, () => {
  test("escapes regex metacharacters", () => {
    const input = "foo.*+?^${}()|[]\\bar";
    const escaped = escapeRegExp(input);

    expect(new RegExp(`^${escaped}$`).test(input)).toBe(true);
  });

  test("does not change ordinary characters", () => {
    expect(escapeRegExp("hello_world123")).toBe("hello_world123");
  });

  test("escapes dashes using a hexadecimal escape", () => {
    expect(escapeRegExp("hello-world")).toBe("hello\\x2dworld");
  });

  test("produces output safe for Unicode regexes", () => {
    const input = "-";
    const escaped = escapeRegExp(input);

    expect(new RegExp(`^${escaped}$`, "u").test(input)).toBe(true);
    expect(new RegExp(`[${escaped}]`, "u").test(input)).toBe(true);
  });

  test("throws TypeError on invalid input", () => {
    expect(() => {
      //@ts-expect-error Testing invalid type on purpose
      escapeRegExp(1);
    }).toThrow(TypeError);
  });
});

describe(strToRegExp.name, () => {
  test("creates a regex which treats the input literally", () => {
    const pattern = strToRegExp("foo.*bar");

    expect(pattern.test("foo.*bar")).toBe(true);
    expect(pattern.test("fooHELLObar")).toBe(false);
  });
});

describe(joinRegExp.name, () => {
  test("joins multiple regular expressions", () => {
    const pattern = joinRegExp([/^/, /foo/, /=/, /bar/, /$/]);

    expect(pattern.test("foo=bar")).toBe(true);
    expect(pattern.test("xfoo=bar")).toBe(false);
  });

  test("supports raw regex source strings", () => {
    const pattern = joinRegExp([/^/, "[a-z]+", /=/, /bar/, /$/]);

    expect(pattern.test("foo=bar")).toBe(true);
    expect(pattern.test("123=bar")).toBe(false);
  });

  test("applies flags", () => {
    const pattern = joinRegExp([/^foo$/], "i");

    expect(pattern.test("FOO")).toBe(true);
    expect(pattern.flags).toContain("i");
  });
});

describe(globToRegExp.name, () => {
  function expectMatches(glob: string, values: string[]): void {
    const regex = globToRegExp(glob);

    for (const value of values) {
      expect({
        glob,
        value,
        regex: regex.source,
      }).toEqual(
        expect.objectContaining({
          value: expect.stringMatching(regex),
        }),
      );
    }
  }

  function expectNotMatches(glob: string, values: string[]): void {
    const regex = globToRegExp(glob);

    for (const value of values) {
      expect(regex.test(value)).toBe(false);
    }
  }

  describe("return value", () => {
    test("returns a RegExp instance", () => {
      expect(globToRegExp("*.ts")).toBeInstanceOf(RegExp);
    });
  });

  describe("literal patterns", () => {
    test.each([
      ["file.txt", "file.txt"],
      ["src/index.ts", "src/index.ts"],
      ["hello world", "hello world"],
      ["", ""],
    ])('matches literal pattern "%s"', (glob, value) => {
      expect(globToRegExp(glob).test(value)).toBe(true);
    });

    test.each([
      ["file.txt", "other.txt"],
      ["file.txt", "prefix-file.txt"],
      ["file.txt", "file.txt.bak"],
      ["src/index.ts", "src/nested/index.ts"],
      ["", "anything"],
    ])('does not partially match "%s" against "%s"', (glob, value) => {
      expect(globToRegExp(glob).test(value)).toBe(false);
    });
  });

  describe("* wildcard", () => {
    test("matches zero or more characters", () => {
      expectMatches("file*.txt", [
        "file.txt",
        "file1.txt",
        "file-test.txt",
        "file.test.txt",
      ]);
    });

    test("does not cross directory separators", () => {
      expectNotMatches("src/*.ts", [
        "src/components/Button.ts",
        "src/utils/helpers.ts",
      ]);
    });

    test("matches files in the same directory", () => {
      expectMatches("src/*.ts", [
        "src/index.ts",
        "src/app.ts",
        "src/.hidden.ts",
      ]);
    });

    test("supports multiple star wildcards", () => {
      expectMatches("*-*.ts", ["foo-bar.ts", "one-two-three.ts", "-.ts"]);

      expectNotMatches("*-*.ts", ["foobar.ts", "foo/bar-baz.ts"]);
    });
  });

  describe("** globstar wildcard", () => {
    test("matches across directory separators", () => {
      expectMatches("src/**/index.ts", [
        "src/components/index.ts",
        "src/components/forms/index.ts",
        "src/a/b/c/index.ts",
      ]);
    });

    test("matches arbitrary nested paths", () => {
      expectMatches("**/*.ts", [
        "src/index.ts",
        "src/components/Button.ts",
        "a/b/c/file.ts",
      ]);
    });

    test("does not match a different extension", () => {
      expectNotMatches("**/*.ts", [
        "src/index.js",
        "src/index.tsx",
        "src/index.ts.bak",
      ]);
    });
  });

  describe("? wildcard", () => {
    test("matches exactly one character", () => {
      expectMatches("file?.txt", ["file1.txt", "fileA.txt", "file-.txt"]);
    });

    test("does not match zero or multiple characters", () => {
      expectNotMatches("file?.txt", ["file.txt", "file12.txt"]);
    });

    test("does not cross directory separators", () => {
      expectNotMatches("src/?/file.ts", ["src//file.ts", "src/a/b/file.ts"]);

      expectMatches("src/?/file.ts", ["src/a/file.ts", "src/1/file.ts"]);
    });
  });

  describe("regex metacharacter escaping", () => {
    test.each([
      ["file.txt", "file.txt"],
      ["file+name.txt", "file+name.txt"],
      ["file(name).txt", "file(name).txt"],
      ["file[name].txt", "file[name].txt"],
      ["file{name}.txt", "file{name}.txt"],
      ["file^name$.txt", "file^name$.txt"],
      ["file|name.txt", "file|name.txt"],
    ])('treats regex characters literally in "%s"', (glob, value) => {
      expect(globToRegExp(glob).test(value)).toBe(true);
    });

    test("does not interpret a dot as any character", () => {
      expect(globToRegExp("file.txt").test("fileXtxt")).toBe(false);
    });

    test("does not interpret plus as a quantifier", () => {
      const regex = globToRegExp("a+b");

      expect(regex.test("a+b")).toBe(true);
      expect(regex.test("ab")).toBe(false);
      expect(regex.test("aaab")).toBe(false);
    });

    test("does not interpret parentheses as capture groups", () => {
      const regex = globToRegExp("file(1).txt");

      expect(regex.test("file(1).txt")).toBe(true);
      expect(regex.test("file1.txt")).toBe(false);
    });

    test("escapes regex characters while preserving wildcards", () => {
      const regex = globToRegExp("file.*.ts");

      expect(regex.test("file.test.ts")).toBe(true);
      expect(regex.test("file..ts")).toBe(true);
      expect(regex.test("fileXtest.ts")).toBe(false);
    });
  });

  describe("combined patterns", () => {
    test("supports multiple wildcard types", () => {
      const regex = globToRegExp("src/**/test-?.*.ts");

      expect(regex.test("src/components/test-a.unit.ts")).toBe(true);
      expect(regex.test("src/a/b/test-1.integration.ts")).toBe(true);

      expect(regex.test("src/components/test-ab.unit.ts")).toBe(false);
      expect(regex.test("src/components/test-a.unit.js")).toBe(false);
    });

    test("matches a wildcard at the beginning", () => {
      const regex = globToRegExp("*.config.ts");

      expect(regex.test("jest.config.ts")).toBe(true);
      expect(regex.test("vite.config.ts")).toBe(true);
      expect(regex.test("config.ts")).toBe(false);
    });

    test("matches a wildcard at the end", () => {
      const regex = globToRegExp("README*");

      expect(regex.test("README")).toBe(true);
      expect(regex.test("README.md")).toBe(true);
      expect(regex.test("README.txt")).toBe(true);
      expect(regex.test("docs/README.md")).toBe(false);
    });
  });

  describe("special values", () => {
    test("a single star matches an empty string", () => {
      expect(globToRegExp("*").test("")).toBe(true);
    });

    test("a single star matches a filename", () => {
      expect(globToRegExp("*").test("file.txt")).toBe(true);
    });

    test("a single star does not match a path", () => {
      expect(globToRegExp("*").test("src/file.txt")).toBe(false);
    });

    test("a single question mark matches one character", () => {
      const regex = globToRegExp("?");

      expect(regex.test("a")).toBe(true);
      expect(regex.test("")).toBe(false);
      expect(regex.test("ab")).toBe(false);
      expect(regex.test("/")).toBe(false);
    });
  });
});
