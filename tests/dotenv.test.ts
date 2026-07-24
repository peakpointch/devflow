import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "@jest/globals";

import { strToRegExp } from "../src/helpers/regexp.js";
import {
  type DotenvCaptureGroups,
  type DotenvQuoteName,
  dotenvLineRegExp,
  dotenvExport,
  dotenvQuote,
  dotenvValue,
  dotenvComment,
  dotenvQuoteMap,
  parseDotenvComment,
  parseDotenvValue,
  parseDotenvKey,
  editDotenvContent,
  editDotenvFile,
} from "../src/helpers/dotenv.js";

const eols = {
  LF: "\n",
  CR: "\r",
  CRLF: "\r\n",
} as const;

const eachEol = Object.entries(eols);
const update = { update: true };

describe(dotenvLineRegExp.name, () => {
  describe("core matching", () => {
    test("matches a basic variable", () => {
      const content = "FOO=bar";
      const matches = [...content.matchAll(dotenvLineRegExp())];
      expect(matches).toHaveLength(1);
      expect(matches[0]?.groups).toMatchObject({
        xport: undefined,
        key: "FOO",
        value: "bar",
        comment: undefined,
      } as DotenvCaptureGroups);
    });

    test("matches a short variable", () => {
      const content = "A=1";
      const matches = [...content.matchAll(dotenvLineRegExp())];
      expect(matches).toHaveLength(1);
      expect(matches[0]?.groups).toMatchObject({
        xport: undefined,
        key: "A",
        value: "1",
        comment: undefined,
      } as DotenvCaptureGroups);
    });

    test("matches an exported variable", () => {
      const content = "export FOO=bar";
      const [match] = [...content.matchAll(dotenvLineRegExp())];
      expect(match?.groups).toMatchObject({
        xport: "export ",
        key: "FOO",
        value: "bar",
      } as DotenvCaptureGroups);
    });

    test.each([
      "",
      "# comment",
      "FOO",
      "=bar",
      "FOO:bar",
      "FOO : bar",
      "export FOO",
    ])("does not match invalid line %p", (content) => {
      expect([...content.matchAll(dotenvLineRegExp())]).toHaveLength(0);
    });
  });

  describe("explicit patterns", () => {
    test("matches only the provided key", () => {
      const pattern = dotenvLineRegExp(strToRegExp("FOO.BAR"));
      expect(pattern.test("FOO.BAR=value")).toBe(true);
      expect(pattern.test("FOOXBAR=value")).toBe(false);
    });

    test("matches only the provided value", () => {
      const pattern = dotenvLineRegExp(/FOO/, strToRegExp("exact.value"));
      expect(pattern.test("FOO=exact.value")).toBe(true);
      expect(pattern.test("FOO=exactXvalue")).toBe(false);
    });
  });

  describe("assignment syntax", () => {
    test("matches equal assignment syntax", () => {
      const lines = ["FOO=bar", "FOO  =   some value"];

      const content = lines.join(eols.LF);
      const [one, two] = [...content.matchAll(dotenvLineRegExp())];

      expect(one?.[0]).toBe(lines[0]);
      expect(one?.groups?.key).toBe("FOO");
      expect(one?.groups?.value).toContain("bar");

      expect(two?.[0]).toBe(lines[1]);
      expect(two?.groups?.key).toBe("FOO");
      expect(two?.groups?.value).toContain("some value");
    });

    test("matches colon assignment syntax", () => {
      const lines = ["FOO: bar", "FOO:    some value"];

      const content = lines.join(eols.LF);
      const [one, two] = [...content.matchAll(dotenvLineRegExp())];

      expect(one?.[0]).toBe(lines[0]);
      expect(one?.groups?.key).toBe("FOO");
      expect(one?.groups?.value).toContain("bar");

      expect(two?.[0]).toBe(lines[1]);
      expect(two?.groups?.key).toBe("FOO");
      expect(two?.groups?.value).toContain("some value");
    });
  });

  // =========================
  // ==== SECTION: values ====
  // =========================

  describe("unquoted values", () => {
    test("matches unquoted values", () => {
      const content = "FOO=hello world";
      const [match] = [...content.matchAll(dotenvLineRegExp())];
      expect(match?.groups?.value).toBe("hello world");
    });

    test("matches unquoted value containing equal signs", () => {
      const [match] = [..."EQUAL_SIGNS=equals==".matchAll(dotenvLineRegExp())];
      expect(match?.groups?.value).toBe("equals==");
    });

    test.each(eachEol)(
      "matches empty value without comment (%s)",
      (_name, eol) => {
        const lines = [
          "# Start of file",
          "EMPTY=",
          "FOO = bar",
          "# End of file",
        ] as const;

        const content = lines.join(eol);
        const [match] = [...content.matchAll(dotenvLineRegExp(/EMPTY/))];

        expect(match?.[0]).toBe("EMPTY=");
        expect(match?.index).toBe(lines[0].length + eol.length);
        expect(match?.groups).toMatchObject({
          key: "EMPTY",
          value: undefined,
        });
      },
    );

    test("matches empty value with comment", () => {
      const eol = eols.LF;
      const lines = [
        "FOO=keep",
        "EMPTY= # comment after empty variable",
        "EMPTY=#no space required",
        "# End of file",
      ] as const;

      const content = lines.join(eol);
      const [one, two] = [...content.matchAll(dotenvLineRegExp(/EMPTY/))];

      expect(one?.[0]).toBe(lines[1]);
      expect(one?.index).toBe(lines[0].length + eol.length);
      expect(one?.groups).toMatchObject({
        key: "EMPTY",
        value: undefined,
        comment: " # comment after empty variable",
      });

      expect(two?.[0]).toBe(lines[2]);
      expect(two?.index).toBe(
        lines[0].length + lines[1].length + 2 * eol.length,
      );
      expect(two?.groups).toMatchObject({
        key: "EMPTY",
        value: undefined,
        comment: "#no space required",
      });
    });
  });

  describe("quoted values", () => {
    test.each(["single", "double", "backtick"])(
      "matches %s-quoted values",
      (name) => {
        const quote = dotenvQuoteMap[name as DotenvQuoteName];
        const value = `${quote}hello world${quote}`;
        const content = `FOO=${value}`;
        const [match] = [...content.matchAll(dotenvLineRegExp())];
        expect(match?.groups?.value).toBe(value);
      },
    );

    test.each(eachEol)("matches multiline value (%s)", (_name, eol) => {
      const multiline: DotenvCaptureGroups = {
        key: "MULTILINE",
        value: `  'This${eol}is a${eol}multiline${eol}value'`,
        comment: " # this is one comment",
      };
      const lines = [
        "# Start of file",
        "FOO=bar",
        `${multiline.key} =${multiline.value}${multiline.comment}`,
        "# Another comment",
        "BAR=foo",
      ];

      const content = lines.join(eol);
      const [match] = [...content.matchAll(dotenvLineRegExp(/MULTILINE/))];

      expect(match?.[0]).toBe(lines[2]);
      expect(match?.index).toBe(
        lines.slice(0, 2).join(eol).length + eol.length,
      );
      expect(match?.groups).toMatchObject(multiline);
    });

    test.each([
      ["single", "double"],
      ["single", "backtick"],
      ["double", "single"],
      ["double", "backtick"],
      ["backtick", "single"],
      ["backtick", "double"],
    ])(
      "matches values with %s quotes inside %s quotes",
      (innerName, outerName) => {
        const inner = dotenvQuoteMap[innerName as DotenvQuoteName];
        const outer = dotenvQuoteMap[outerName as DotenvQuoteName];
        const value = `${outer}${innerName} ${inner}quotes${inner} work inside ${outerName} quotes${outer}`;
        const [match] = [...`FOO=${value}`.matchAll(dotenvLineRegExp())];
        expect(match?.groups?.value).toBe(value);
      },
    );

    test.each(["single", "double", "backtick"])(
      "matches values with escaped %s quotes inside same-quoted values",
      (name) => {
        const quote = dotenvQuoteMap[name as DotenvQuoteName];
        const value = `${quote}escaped \\${quote} quotes work inside \\${quote} quotes${quote}`;
        const lines = [`FOO=${value}`].join(eols.LF);
        const [match] = [...lines.matchAll(dotenvLineRegExp())];
        expect(match?.groups?.value).toBe(value);
      },
    );

    test.each(["single", "double", "backtick"])(
      "matches empty value using %s quotes",
      (name) => {
        const quote = dotenvQuoteMap[name as DotenvQuoteName];
        const value = quote.repeat(2);
        const content = `EMPTY=${value}`;
        const [match] = [...content.matchAll(dotenvLineRegExp(/EMPTY/))];
        expect(match?.groups?.value).toBe(value);
      },
    );
  });

  // ===========================
  // ==== SECTION: comments ====
  // ===========================

  describe("comments", () => {
    test.each(eachEol)("matches an inline comment (%s)", (_name, eol) => {
      const lines = [
        "# Start of file",
        "INLINE_COMMENT_SPACE=bar   # Some comment",
        "# Do not match this",
        "INLINE_COMMENT_NOSPACE=inline comments start with a#number sign. no space required",
        "# Do not match this",
      ];

      const content = lines.join(eol);
      const [one, two] = [...content.matchAll(dotenvLineRegExp())];

      expect(one?.[0]).toBe(lines[1]);
      expect(one?.groups).toMatchObject({
        key: "INLINE_COMMENT_SPACE",
        value: "bar",
        comment: "   # Some comment",
      } as DotenvCaptureGroups);
      expect(two?.[0]).toBe(lines[3]);
      expect(two?.groups).toMatchObject({
        key: "INLINE_COMMENT_NOSPACE",
        value: "inline comments start with a",
        comment: "#number sign. no space required",
      } as DotenvCaptureGroups);
    });

    test.each(["single", "double", "backtick"])(
      "distinguishes hashes inside %s-quoted values from comments",
      (name) => {
        const quote = dotenvQuoteMap[name as DotenvQuoteName];
        const value = `${quote}inline # hashtag value${quote}`;
        const comment = " # real comment";
        const content = `FOO=${value}${comment}`;
        const [match] = [...content.matchAll(dotenvLineRegExp())];
        expect(match?.groups).toMatchObject({
          value,
          comment,
        });
      },
    );
  });

  // =============================
  // ==== SECTION: whitespace ====
  // =============================

  describe("whitespace", () => {
    test.each(eachEol)(
      "matches whitespace to the correct capture groups (%s)",
      (_name, eol) => {
        const lines = [
          "    SPACED_KEY = parsed",
          "  export    SPACED_KEY =       parsed  #comment",
          "    SPACED_KEY  =    'parsed'",
          "    COLON_ASSIGN:    'please'",
        ];

        const content = lines.join(eol);
        const [one, two, three, four] = [
          ...content.matchAll(dotenvLineRegExp()),
        ];

        expect(one?.groups).toMatchObject({
          key: "SPACED_KEY",
          value: " parsed",
        });
        expect(two?.groups).toMatchObject({
          key: "SPACED_KEY",
          value: "       parsed",
          xport: "export    ",
          comment: "  #comment",
        });
        expect(three?.groups).toMatchObject({
          key: "SPACED_KEY",
          value: "    'parsed'",
        });
        expect(four?.groups).toMatchObject({
          key: "COLON_ASSIGN",
          value: "   'please'",
        });
      },
    );

    test("matches tabs as horizontal whitespace", () => {
      const content = "\texport\tFOO\t=\tbar\t# comment";
      const [match] = [...content.matchAll(dotenvLineRegExp())];
      expect(match?.groups).toMatchObject({
        xport: "export\t",
        key: "FOO",
        value: "\tbar",
        comment: "\t# comment",
      });
    });
  });
});

describe(dotenvQuote.name, () => {
  test("escapes unescaped double quotes", () => {
    expect(dotenvQuote('say "hello"')).toBe('"say \\"hello\\""');
  });

  test("does not double-escape already escaped double quotes", () => {
    expect(dotenvQuote('say \\"hello\\"')).toBe('"say \\"hello\\""');
  });

  test("supports single quotes", () => {
    expect(dotenvQuote("it's fine", "single")).toBe("'it\\'s fine'");
  });

  test("supports backticks", () => {
    expect(dotenvQuote("value `here`", "backtick")).toBe("`value \\`here\\``");
  });
});

describe(dotenvValue.name, () => {
  test("does not quote a valid unquoted value", () => {
    expect(dotenvValue("hello")).toBe("hello");
  });

  test("does not quote a value containing spaces", () => {
    expect(dotenvValue("hello world")).toBe("hello world");
  });

  test("quotes a value containing a hash", () => {
    expect(dotenvValue("hello#world")).toBe('"hello#world"');
  });

  test("leaves an already valid quoted value unchanged", () => {
    expect(dotenvValue('"hello world"')).toBe('"hello world"');
  });

  test("forces quotes when force is true", () => {
    expect(
      dotenvValue("hello", {
        force: true,
      }),
    ).toBe('"hello"');
  });

  test("escapes quotes when adding quotes", () => {
    expect(dotenvValue('say #"hello"')).toBe('"say #\\"hello\\""');
  });

  test("supports empty values", () => {
    expect(dotenvValue("")).toBe("");
  });
});

describe(dotenvExport.name, () => {
  test.each([
    [true, "export "],
    [false, ""],
    [undefined, ""],
    ["export ", "export "],
    ["xprt", ""],
  ])("dotenvExport(%p) returns %p", (input, expected) => {
    expect(dotenvExport(input)).toBe(expected);
  });
});

describe(dotenvComment.name, () => {
  test("formats a comment", () => {
    expect(dotenvComment("Some comment")).toBe(" # Some comment");
  });

  test("does not format a formatted comment", () => {
    expect(dotenvComment("#New formatted comment")).toBe(
      "#New formatted comment",
    );
  });

  test.each([
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("dotenvComment(%p) returns an empty string", (input, expected) => {
    expect(dotenvComment(input)).toBe(expected);
  });
});

describe(parseDotenvComment.name, () => {
  test("remove leading # and whitespace", () => {
    expect(parseDotenvComment("   # This is a comment")).toBe(
      "This is a comment",
    );
    expect(parseDotenvComment("#anothercomment")).toBe("anothercomment");
  });

  test("keep hashes after a non-space character", () => {
    expect(parseDotenvComment("hashes after normal chars # are kept")).toBe(
      "hashes after normal chars # are kept",
    );
  });

  test("keep all hashes that are not the first hash", () => {
    expect(parseDotenvComment("# a comment with a # character")).toBe(
      "a comment with a # character",
    );
  });

  test("return undefined if provided with an invalid comment", () => {
    expect(parseDotenvComment(null)).toBeUndefined();
    expect(parseDotenvComment(undefined)).toBeUndefined();
  });

  test("preserve empty comments", () => {
    expect(parseDotenvComment("")).toBe("");
    expect(parseDotenvComment("   #  ")).toBe("");
  });
});

describe(parseDotenvKey.name, () => {
  test.each(["", null, undefined])('throw on nullish key "%s"', (input) => {
    expect(() => {
      //@ts-expect-error parseDotenvKey expects a string
      parseDotenvKey(input);
    }).toThrow(Error);
  });

  test.each(["spaced key", "hastag#char", "unallowed–—chars"])(
    'throw on invalid key "%s"',
    (input) => {
      expect(() => {
        parseDotenvKey(input);
      }).toThrow(Error);
    },
  );

  test.each(["FOO", "bar", "VALID_KEY", "valid-key"])(
    "return valid key",
    (input) => {
      expect(parseDotenvKey(input)).toBe(input);
    },
  );
});

describe(parseDotenvValue.name, () => {
  test.each(["foo", "hello world", "hello_world", "hello-world"])(
    "do not touch trimmed unquoted values",
    (value) => {
      expect(parseDotenvValue(value)).toBe(value);
    },
  );

  test("default to an empty string on nullish values", () => {
    expect(parseDotenvValue(null)).toBe("");
    expect(parseDotenvValue(undefined)).toBe("");
  });

  test.each(["single", "double", "backtick"])(
    "parses empty %s-quoted values",
    (name) => {
      const quote = dotenvQuoteMap[name as DotenvQuoteName];
      expect(parseDotenvValue(quote.repeat(2))).toBe("");
    },
  );

  test("trim unquoted values", () => {
    expect(parseDotenvValue("  \thelloWorld  \n \r\n \t")).toBe("helloWorld");
  });

  test.each(["single", "double", "backtick"])(
    "remove wrapping quotes from %s-quoted values",
    (name) => {
      const quote = dotenvQuoteMap[name as DotenvQuoteName];
      const value = "foo bar";
      const raw = `  ${quote}${value}${quote}\t`;
      expect(parseDotenvValue(raw)).toBe(value);
    },
  );

  test.each([
    ["single", "double"],
    ["single", "backtick"],
    ["double", "single"],
    ["double", "backtick"],
    ["backtick", "single"],
    ["backtick", "double"],
  ])("keep %s quotes inside %s-quoted values", (innerName, outerName) => {
    const inner = dotenvQuoteMap[innerName as DotenvQuoteName];
    const outer = dotenvQuoteMap[outerName as DotenvQuoteName];
    const parsed = `${innerName} ${inner}quotes${inner} work inside ${outerName} quotes`;
    const raw = `${outer}${parsed}${outer}`;
    expect(parseDotenvValue(raw)).toBe(parsed);
  });

  test.each(["single", "double", "backtick"])(
    "do not trim %s-quoted values",
    (name) => {
      const quote = dotenvQuoteMap[name as DotenvQuoteName];
      const value = " foo\tbar ";
      const raw = `\t ${quote}${value}${quote}\r\n`;
      expect(parseDotenvValue(raw)).toBe(value);
    },
  );

  test.each(["double"])("expand newlines in %s-quoted values", (name) => {
    const quote = dotenvQuoteMap[name as DotenvQuoteName];
    const raw = `${quote}This is\\na\\nmultiline\\nvalue${quote}`;
    const parsed = "This is\na\nmultiline\nvalue";
    expect(parseDotenvValue(raw)).toBe(parsed);
  });

  test.each(["single", "backtick"])(
    "don't expand newlines in %s-quoted values",
    (name) => {
      const quote = dotenvQuoteMap[name as DotenvQuoteName];
      const raw = `${quote}This escaped value\\nwill\\nnot\\nbe expanded${quote}`;
      const parsed = `This escaped value\\nwill\\nnot\\nbe expanded`;
      expect(parseDotenvValue(raw)).toBe(parsed);
    },
  );
});

describe(editDotenvContent.name, () => {
  // ===================================
  // ==== SECTION: adding variables ====
  // ===================================

  describe("adding variables", () => {
    test("adds a variable to empty content", () => {
      const result = editDotenvContent(
        "",
        {
          FOO: "bar",
        },
        {},
      );
      expect(result).toEqual({
        content: "FOO=bar",
        errors: [],
      });
    });

    test.each(eachEol)(
      "adds a variable to existing variables (%s)",
      (_name, eol) => {
        const content = [
          "# Start of file",
          "FOO=bar",
          "BAR=baz",
          "# End of file",
        ].join(eol);
        const result = editDotenvContent(
          content,
          {
            NEW_VAR: "value",
          },
          {},
        );
        expect(result.content).toBe(
          [
            "# Start of file",
            "FOO=bar",
            "BAR=baz",
            "# End of file",
            "NEW_VAR=value",
          ].join(eol),
        );
        expect(result.errors).toEqual([]);
      },
    );

    test("adds an empty variable", () => {
      const result = editDotenvContent("", { FOO: "" });
      expect(result.content).toBe("FOO=");
    });

    test("adds an exported variable with a comment", () => {
      const result = editDotenvContent(
        "",
        {
          FOO: {
            value: "bar",
            xport: true,
            comment: "Some comment",
          },
        },
        {},
      );
      expect(result.content).toBe("export FOO=bar # Some comment");
    });

    test("does not add variable with an invalid key", () => {
      const result = editDotenvContent(
        "GOOD=value",
        {
          "BAD KEY": "value",
        },
        {},
      );
      expect(result.content).toBe("GOOD=value");
      expect(result.errors).toHaveLength(1);
    });

    test("does not add variable with a null or undefined value", () => {
      const result = editDotenvContent("", { FOO: undefined, BAR: null });
      expect(result.content).toBe("");
      expect(result.errors).toHaveLength(2);
    });
  });

  // =====================================
  // ==== SECTION: updating variables ====
  // =====================================

  describe("updating variables", () => {
    test("does not overwrite existing variables when update is false", () => {
      const result = editDotenvContent(
        "FOO=old",
        { FOO: "new" },
        { update: false },
      );

      expect(result.content).toBe("FOO=old");
      expect(result.errors).toHaveLength(1);
    });

    test.each(eachEol)(
      "replaces only the targeted variable (%s)",
      (_name, eol) => {
        const result = editDotenvContent(
          ["FIRST='value'", "FOO=old", "BAR=keep"].join(eol),
          {
            FOO: {
              value: "new",
              xport: true,
            },
          },
          { ...update },
        );
        expect(result.content).toBe(
          ["FIRST='value'", "export FOO=new", "BAR=keep"].join(eol),
        );
        expect(result.errors).toEqual([]);
      },
    );

    test.each(eachEol)("updates multiple variables (%s)", (_name, eol) => {
      //  NOTE: Keep the names and values one char here, as this is a good edge case to test
      const result = editDotenvContent(
        ["Z=0", "A=1", "B=2", "C=three", "D=4"].join(eol),
        {
          A: "one",
          B: { value: "two", comment: "some comment" },
          C: "3",
        },
        { ...update },
      );
      expect(result.content).toBe(
        ["Z=0", "A=one", "B=two # some comment", "C=3", "D=4"].join(eol),
      );
      expect(result.errors).toEqual([]);
    });
  });

  // ==========================
  // ==== SECTION: exports ====
  // ==========================

  describe("updating exports", () => {
    test("preserves existing export", () => {
      const result = editDotenvContent(
        "export FOO=old",
        { FOO: "new" },
        { ...update },
      );
      expect(result.content).toBe("export FOO=new");
    });

    test("adds export to an existing variable", () => {
      const result = editDotenvContent(
        "FOO=bar # Not xprtd before",
        { FOO: { xport: true } },
        { ...update },
      );

      expect(result.content).toBe("export FOO=bar # Not xprtd before");
    });

    test("removes export from an existing variable", () => {
      const result = editDotenvContent(
        "export FOO=bar # Xprtd before",
        { FOO: { xport: false } },
        { ...update },
      );

      expect(result.content).toBe("FOO=bar # Xprtd before");
    });
  });

  // =======================
  // ==== SECTION: keys ====
  // =======================

  describe("updating keys", () => {
    test("renames an existing variable", () => {
      const result = editDotenvContent(
        "FOO_OLD=value",
        {
          FOO_OLD: { key: "FOO_NEW", value: "updated" },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO_NEW=updated");
    });

    test("updates new key when original key does not exist", () => {
      const result = editDotenvContent(
        "FOO=value",
        {
          NON_EXISTENT: { key: "FOO", value: "updated" },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO=updated");
    });

    test("adds the renamed variable when neither key exists", () => {
      const result = editDotenvContent(
        "",
        {
          NON_EXISTENT: { key: "NEW_VAR", value: "value" },
        },
        { ...update },
      );
      expect(result.content).toBe("NEW_VAR=value");
    });

    test("does not rename to an invalid key", () => {
      const result = editDotenvContent(
        "FOO_OLD=value",
        {
          FOO_OLD: { key: "BAD KEY", value: "updated" },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO_OLD=value");
      expect(result.errors).toHaveLength(1);
    });
  });

  // =========================
  // ==== SECTION: values ====
  // =========================

  describe("updating values", () => {
    test("preserves existing value if value is undefined", () => {
      const result = editDotenvContent("FOO=bar", { FOO: {} }, { ...update });
      expect(result.content).toBe("FOO=bar");
    });

    test("does not preserve existing value if value is an empty string", () => {
      const result = editDotenvContent(
        "FOO=bar",
        {
          FOO: { value: "" },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO=");
    });

    test("forces quotes when quotes.force is true", () => {
      const result = editDotenvContent(
        "FOO=old",
        {
          FOO: "new",
        },
        {
          update: true,
          quotes: {
            force: true,
          },
        },
      );
      expect(result.content).toBe('FOO="new"');
    });
  });

  // ===========================
  // ==== SECTION: comments ====
  // ===========================

  describe("updating comments", () => {
    test("preserves an existing comment and its format", () => {
      const result = editDotenvContent(
        "FOO=old  #   Keep this comment",
        {
          FOO: "new",
        },
        { comments: { forceFormat: false }, ...update },
      );

      expect(result.content).toBe("FOO=new  #   Keep this comment");
    });

    test("preserves an existing comment without its format", () => {
      const result = editDotenvContent(
        "FOO=old  #   Reformat this comment",
        {
          FOO: "new",
        },
        { comments: { forceFormat: true }, ...update },
      );

      expect(result.content).toBe("FOO=new # Reformat this comment");
    });

    test("overrides an existing comment", () => {
      const result = editDotenvContent(
        "FOO=bar #   Old comment",
        {
          FOO: {
            comment: "New comment",
          },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO=bar # New comment");
    });

    test("removes the existing comment", () => {
      const result = editDotenvContent(
        "FOO=bar # Existing comment",
        {
          FOO: {
            comment: "",
          },
        },
        { ...update },
      );
      expect(result.content).toBe("FOO=bar");
    });

    test.each(eachEol)("preserves standalone comments (%s)", (_name, eol) => {
      const content = [
        "FOO=old",
        "# Standalone comments",
        "# Work super well",
        "BAR=keep # And this comment goes...",
        "# ...to the next line",
      ].join(eol);
      const result = editDotenvContent(
        content,
        {
          FOO: "new",
          NEW_VAR: "new value",
        },
        { ...update },
      );

      expect(result.content).toBe(
        [
          "FOO=new",
          "# Standalone comments",
          "# Work super well",
          "BAR=keep # And this comment goes...",
          "# ...to the next line",
          "NEW_VAR=new value",
        ].join(eol),
      );
    });
  });

  // ==========================================
  // ==== SECTION: duplicates, errors etc. ====
  // ==========================================

  describe("duplicates", () => {
    test("updates only the first duplicate when deduplicate is false", () => {
      const result = editDotenvContent(
        "FOO=one\nBAR=keep\nFOO=two",
        {
          FOO: "new",
        },
        {
          ...update,
          deduplicate: false,
        },
      );
      expect(result.content).toBe("FOO=new\nBAR=keep\nFOO=two");
      expect(result.errors).toHaveLength(1);
    });

    test.each(eachEol)(
      "deletes duplicate definitions when deduplicate is true (%s)",
      (_name, eol) => {
        const content = ["FOO=one", "BAR=keep", "FOO=two"].join(eol);
        const result = editDotenvContent(
          content,
          {
            FOO: "new",
          },
          {
            ...update,
            deduplicate: true,
          },
        );
        expect(result.content).toBe(["FOO=new", "BAR=keep"].join(eol));
        expect(result.errors).toEqual([
          'Multiple definitions of variable: "FOO". Deleting duplicates...',
        ]);
      },
    );
  });
});

describe(editDotenvFile.name, () => {
  let tempDir: string | undefined;

  function createEnvPath(): string {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotenv-test-"));

    return path.join(tempDir, ".env");
  }

  afterEach(() => {
    if (tempDir !== undefined) {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });

      tempDir = undefined;
    }
  });

  test("creates a missing .env file", () => {
    const envPath = createEnvPath();

    editDotenvFile(envPath, {
      FOO: "bar",
    });

    expect(fs.readFileSync(envPath, "utf8")).toBe("FOO=bar");
  });

  test("updates an existing .env file", () => {
    const envPath = createEnvPath();

    fs.writeFileSync(envPath, "FOO=old\nBAR=keep", "utf8");

    editDotenvFile(
      envPath,
      {
        FOO: "new",
      },
      { ...update },
    );

    expect(fs.readFileSync(envPath, "utf8")).toBe("FOO=new\nBAR=keep");
  });
});
