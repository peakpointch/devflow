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
