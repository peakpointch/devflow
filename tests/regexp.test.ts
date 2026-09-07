import { describe, expect, test } from "@jest/globals";

import {
  anchorRegExp,
  escapeRegExp,
  groupRegExp,
  joinRegExp,
  optionalRegExp,
  strToRegExp,
  globToRegExp,
  unionRegExp,
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

describe(groupRegExp.name, () => {
  test("creates a capturing group", () => {
    const pattern = groupRegExp(/foo/);
    const match = pattern.exec("foo");

    expect(match?.[1]).toBe("foo");
  });

  test("joins multiple patterns inside the group", () => {
    const pattern = groupRegExp([/foo/, "=", /bar/]);

    expect(pattern.source).toBe("(foo=bar)");
    expect(pattern.test("foo=bar")).toBe(true);
  });

  test("creates a named capturing group", () => {
    const pattern = groupRegExp(/foo/, { name: "value" });
    const match = pattern.exec("foo");

    expect(match?.groups?.value).toBe("foo");
  });

  test("creates a non-capturing group", () => {
    const pattern = groupRegExp(/foo/, { nonCapturing: true });
    const match = pattern.exec("foo");

    expect(pattern.source).toBe("(?:foo)");
    expect(match).toHaveLength(1);
  });

  test("makes the group optional", () => {
    const pattern = anchorRegExp(groupRegExp(/foo/, { optional: true }));

    expect(pattern.test("")).toBe(true);
    expect(pattern.test("foo")).toBe(true);
    expect(pattern.test("bar")).toBe(false);
  });

  test("inherits flags and supports overriding them", () => {
    expect(groupRegExp(/foo/i).flags).toContain("i");
    expect(groupRegExp(/foo/i, { flags: "g" }).flags).toBe("g");
  });
});

describe(optionalRegExp.name, () => {
  test("makes a pattern optional without capturing it", () => {
    const pattern = anchorRegExp(optionalRegExp(/foo/));
    const match = pattern.exec("foo");

    expect(pattern.test("")).toBe(true);
    expect(match).toHaveLength(1);
  });

  test("joins multiple patterns into one optional group", () => {
    const pattern = anchorRegExp(optionalRegExp([/foo/, "=", /bar/]));

    expect(pattern.test("")).toBe(true);
    expect(pattern.test("foo=bar")).toBe(true);
    expect(pattern.test("foo=")).toBe(false);
  });

  test("inherits flags and supports overriding them", () => {
    expect(optionalRegExp(/foo/i).flags).toContain("i");
    expect(optionalRegExp(/foo/i, "g").flags).toBe("g");
  });
});

describe(unionRegExp.name, () => {
  test("combines regular expressions as alternatives", () => {
    const pattern = anchorRegExp(unionRegExp([/foo/, /bar/]));

    expect(pattern.test("foo")).toBe(true);
    expect(pattern.test("bar")).toBe(true);
    expect(pattern.test("baz")).toBe(false);
  });

  test("treats string alternatives literally", () => {
    const pattern = anchorRegExp(unionRegExp(["foo.bar", "baz+"]));

    expect(pattern.test("foo.bar")).toBe(true);
    expect(pattern.test("fooXbar")).toBe(false);
    expect(pattern.test("baz+")).toBe(true);
  });

  test("ignores empty string alternatives", () => {
    const pattern = anchorRegExp(unionRegExp(["", /foo/]));

    expect(pattern.test("foo")).toBe(true);
    expect(pattern.test("")).toBe(false);
  });

  test("applies flags", () => {
    const pattern = unionRegExp([/foo/, "bar"], "i");

    expect(pattern.test("FOO")).toBe(true);
    expect(pattern.test("BAR")).toBe(true);
    expect(pattern.flags).toContain("i");
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
