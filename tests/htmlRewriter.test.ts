import { describe, expect, jest, test } from "@jest/globals";

import {
  type CompleteHtmlElement,
  countHtmlElementsWithAttribute,
  createAttributeRegExp,
  createClosingTagRegExp,
  createOpeningTagRegExp,
  createPairedElementRegExp,
  decodeHtmlAttribute,
  encodeHtmlAttribute,
  findHtmlElements,
  findHtmlOpeningTags,
  insertBeforeClosingHtmlTag,
  parseHtmlAttributes,
  patchHtmlAttributes,
  removeHtmlFragments,
  replaceEmptyHtmlElements,
  replaceHtmlOpeningTags,
  setHtmlAttributes,
  stringifyHtmlAttributes,
  stringifyHtmlElement,
} from "../src/helpers/htmlRewriter.js";

function matches(pattern: RegExp, source: string): RegExpMatchArray[] {
  return Array.from(source.matchAll(pattern));
}

function matchedTexts(pattern: RegExp, source: string): string[] {
  return matches(pattern, source).map((match) => match[0]);
}

describe(createOpeningTagRegExp.name, () => {
  test.each([
    {
      label: "a tag without attributes",
      source: "before <article> after",
      expected: ["<article>"],
    },
    // NOTE: Skipping this because of the same regex limitation reason in createAttributeRegExp
    // {
    //   label: "boolean and quoted attributes",
    //   source: "<article hidden data-id=\"42\" title='A > B'>body",
    //   expected: ["<article hidden data-id=\"42\" title='A > B'>"],
    // },
    {
      label: "a self-closing tag",
      source: '<article data-id="42" />',
      expected: ['<article data-id="42" />'],
    },
    {
      label: "mixed casing",
      source: "<ARTICLE></ARTICLE>",
      expected: ["<ARTICLE>"],
    },
    {
      label: "multiple opening tags",
      source: "<article><span></span><article >",
      expected: ["<article>", "<article >"],
    },
    {
      label: "newlines between attributes",
      source: "<article\nclass=\"story\"\naria-label='News'\n>",
      expected: ["<article\nclass=\"story\"\naria-label='News'\n>"],
    },
  ])("matches $label", ({ source, expected }) => {
    expect(matchedTexts(createOpeningTagRegExp("article"), source)).toEqual(
      expected,
    );
  });

  test.each([
    ["a longer tag name", "<article-card></article-card>"],
    ["a tag-name prefix", "<articles></articles>"],
    ["a closing tag", "</article>"],
    // NOTE: Skipping here ...
    // ["an unquoted attribute value", "<article data-id=42>"], // This is unnecessary, by "not supporting unquoted attribute values" I meant I do not care about them, not explicitly UN-SUPPORT them.
    // ["an unterminated double-quoted value", '<article title="news>'], // Do we really need to test for SYNTAX ERRORS?? REALLY??
    // ["an unterminated single-quoted value", "<article title='news>"], // Same here...
    ["an incomplete tag", "<article"], // This is fair enough
    ["whitespace before the tag name", "< article>"],
  ])("does not match %s", (_label, source) => {
    expect(matchedTexts(createOpeningTagRegExp("article"), source)).toEqual([]);
  });

  test("captures opening-tag metadata", () => {
    const [match] = matches(
      createOpeningTagRegExp("article"),
      '<ARTICLE id="story" hidden />',
    );

    expect(match?.[0]).toBe(`<ARTICLE id="story" hidden />`);
    expect(match?.groups).toEqual(
      expect.objectContaining({
        tagName: "ARTICLE",
        selfClosing: "/",
      }),
    );
    expect(match?.groups?.attributes?.trim()).toBe('id="story" hidden');
  });

  test("captures an absent self-closing marker as absent", () => {
    const [match] = matches(createOpeningTagRegExp("div"), '<div id="main">');

    expect(match?.groups?.selfClosing).toBeUndefined();
  });

  test("matches any valid tag name when no name is supplied", () => {
    const found = matches(
      createOpeningTagRegExp(),
      "<div><x-card data-id='1' /></div><br>",
    );

    expect(found.map((match) => match[0])).toEqual([
      "<div>",
      "<x-card data-id='1' />",
      "<br>",
    ]);
    expect(found.map((match) => match.groups?.tagName)).toEqual([
      "div",
      "x-card",
      "br",
    ]);
  });

  test("treats the supplied tag name as data, not regex source", () => {
    expect(
      matchedTexts(
        createOpeningTagRegExp("div|span"),
        "<div></div><span></span>",
      ),
    ).toEqual([]);
  });
});

describe(createClosingTagRegExp.name, () => {
  test.each([
    {
      label: "an ordinary closing tag",
      source: "<section>text</section>",
      expected: ["</section>"],
    },
    {
      label: "mixed casing and trailing whitespace",
      source: "</SECTION   >",
      expected: ["</SECTION   >"],
    },
    {
      label: "multiple closing tags",
      source: "</section></SECTION> <section></section>",
      expected: ["</section>", "</SECTION>", "</section>"],
    },
  ])("matches $label", ({ source, expected }) => {
    expect(matchedTexts(createClosingTagRegExp("section"), source)).toEqual(
      expected,
    );
  });

  test.each([
    ["an opening tag", "<section>"],
    ["a tag-name prefix", "</sectional>"],
    ["attributes on a closing tag", '</section id="bad">'],
    ["a missing closing bracket", "</section"],
    ["whitespace between the slash and name", "</ section>"],
  ])("does not match %s", (_label, source) => {
    expect(matchedTexts(createClosingTagRegExp("section"), source)).toEqual([]);
  });

  test("captures closing-tag metadata if needed", () => {
    const [match] = matches(createClosingTagRegExp("section"), "</SECTION >");

    expect(match?.[0]).toBe("</SECTION >");
    expect(match?.groups).toEqual(
      expect.objectContaining({
        tagName: "SECTION",
      }),
    );
  });

  test("matches any valid closing tag when no name is supplied", () => {
    const found = matches(
      createClosingTagRegExp(),
      "</div> </x-card > </custom-element>",
    );

    expect(found.map((match) => match[0])).toEqual([
      "</div>",
      "</x-card >",
      "</custom-element>",
    ]);
    expect(found.map((match) => match.groups?.tagName)).toEqual([
      "div",
      "x-card",
      "custom-element",
    ]);
  });

  test("treats the supplied tag name as data, not regex source", () => {
    expect(
      matchedTexts(createClosingTagRegExp("div|span"), "</div></span>"),
    ).toEqual([]);
  });
});

describe(createPairedElementRegExp.name, () => {
  test.each([
    {
      label: "empty content",
      source: "before <p></p> after",
      innerPattern: /[\s\S]*?/,
      expected: ["<p></p>"],
    },
    {
      label: "text content",
      source: "<p>Hello, world!</p>",
      innerPattern: /[\s\S]*?/,
      expected: ["<p>Hello, world!</p>"],
    },
    {
      label: "nested markup with line breaks",
      source: '<P class="lead">first\n<strong>second</strong></p>',
      innerPattern: /[\s\S]*?/,
      expected: ['<P class="lead">first\n<strong>second</strong></p>'],
    },
    {
      label: "multiple sibling elements",
      source: "<p>one</p><div>skip</div><P>two</P>",
      innerPattern: /[\s\S]*?/,
      expected: ["<p>one</p>", "<P>two</P>"],
    },
    {
      label: "content constrained by the caller's pattern",
      source: "<p>12345</p><p>abc</p>",
      innerPattern: /\d+/,
      expected: ["<p>12345</p>"],
    },
  ])("matches $label", ({ source, innerPattern, expected }) => {
    expect(
      matchedTexts(createPairedElementRegExp("p", innerPattern), source),
    ).toEqual(expected);
  });

  test.each([
    ["a mismatched closing tag", "<p>text</div>"],
    ["a missing closing tag", "<p>text"],
    ["a closing tag without an opening tag", "text</p>"],
    ["a self-closing opening tag", "<p />"],
    // INFO: Skipping this again...
    // ["an unquoted opening-tag attribute", "<p class=lead>text</p>"],
    ["a longer tag name", "<picture>text</picture>"],
  ])("does not match %s", (_label, source) => {
    expect(
      matchedTexts(createPairedElementRegExp("p", /[\s\S]*?/), source),
    ).toEqual([]);
  });

  test("captures all reliably identified element boundaries", () => {
    const [match] = matches(
      createPairedElementRegExp("article", /[\s\S]*?/),
      '<ARTICLE data-id="7">content</article >',
    );

    expect(match?.groups).toEqual(
      expect.objectContaining({
        openingTag: '<ARTICLE data-id="7">',
        tagName: "ARTICLE",
        innerHtml: "content",
        closingTag: "</article >",
      }),
    );
    expect(match?.groups?.attributes?.trim()).toBe('data-id="7"');
  });

  test("preserves named captures from the supplied inner pattern", () => {
    const [match] = matches(
      createPairedElementRegExp("p", /author: (?<author>[A-Za-z ]+)/),
      "<p>author: Ada Lovelace</p>",
    );

    expect(match?.groups?.author).toBe("Ada Lovelace");
    expect(match?.groups?.innerHtml).toBe("author: Ada Lovelace");
  });

  // WARNING: Skipping because we don't need it yet and because we don't preserve flags yet.
  test.skip.each([
    {
      label: "case-insensitive", // WARNING: how to test case sensitive though?
      innerPattern: /hello/i,
      source: "<p>HELLO</p>",
    },
    {
      label: "dot-all",
      innerPattern: /first.*last/s,
      source: "<p>first\nlast</p>",
    },
  ])(
    "preserves the supplied pattern's $label semantics",
    ({ innerPattern, source }) => {
      const pattern = createPairedElementRegExp("p", innerPattern);
      expect(matchedTexts(pattern, source)).toEqual([source]);
    },
  );

  test("requires the inner pattern to account for the complete inner HTML", () => {
    expect(
      matchedTexts(
        createPairedElementRegExp("p", /hello/),
        "<p>well hello there</p>",
      ),
    ).toEqual([]);
  });

  test("treats the supplied tag name as data, not regex source", () => {
    expect(
      matchedTexts(
        createPairedElementRegExp("div|span", /[\s\S]*?/),
        "<div></div><span></span>",
      ),
    ).toEqual([]);
  });
});

describe(createAttributeRegExp.name, () => {
  test.each([
    {
      label: "a boolean attribute",
      source: "disabled",
      name: "disabled",
      expectedValue: undefined,
    },
    {
      label: "a double-quoted value",
      source: 'class="button primary"',
      name: "class",
      expectedValue: "button primary",
    },
    {
      label: "a single-quoted value",
      source: "title='A > B'",
      name: "title",
      expectedValue: "A > B",
    },
    {
      label: "an empty value",
      source: 'data-state=""',
      name: "data-state",
      expectedValue: "",
    },
    {
      label: "whitespace around the assignment",
      source: "aria-label \n = \t 'Menu'",
      name: "aria-label",
      expectedValue: "Menu",
    },
    {
      label: "an entity-encoded value",
      source: 'title="Tom &amp; Jerry &quot;Special&quot;"',
      name: "title",
      expectedValue: "Tom &amp; Jerry &quot;Special&quot;",
    },
    {
      label: "a single quote inside a double-quoted value",
      source: 'title="developer\'s guide"',
      name: "title",
      expectedValue: "developer's guide",
    },
    {
      label: "a double quote inside a single-quoted value",
      source: "title='the \"quoted\" word'",
      name: "title",
      expectedValue: 'the "quoted" word',
    },
  ])("matches $label", ({ source, name, expectedValue }) => {
    const found = matches(createAttributeRegExp(name), source);

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.name).toBe(name);
    expect(found[0]?.groups?.value).toBe(expectedValue);
  });

  test("captures the quote used by a valued attribute", () => {
    const [doubleQuoted] = matches(
      createAttributeRegExp("title"),
      'title="News"',
    );
    const [singleQuoted] = matches(
      createAttributeRegExp("title"),
      "title='News'",
    );

    expect(doubleQuoted?.groups?.quote).toBe('"');
    expect(singleQuoted?.groups?.quote).toBe("'");
  });

  test("captures a boolean attribute without value or quote metadata", () => {
    const [match] = matches(createAttributeRegExp("disabled"), "disabled");

    expect(match?.groups).toEqual(
      expect.objectContaining({ name: "disabled" }),
    );
    expect(match?.groups?.value).toBeUndefined();
    expect(match?.groups?.quote).toBeUndefined();
  });

  test("matches names case-insensitively and values case-sensitively", () => {
    const found = matches(
      createAttributeRegExp("data-state", "open"),
      'DATA-STATE="Open" data-state="open"',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.name).toBe("data-state");
    expect(found[0]?.groups?.value).toBe("open");
  });

  test("filters by an exact literal value", () => {
    const literal = ".*+?^${}()|[]\\";
    const source = `data-value="not literal" data-value="${literal}"`;
    const found = matches(createAttributeRegExp("data-value", literal), source);

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.value).toBe(literal);
  });

  test("can filter by value without filtering by name", () => {
    const found = matches(
      createAttributeRegExp(undefined, "same"),
      'id="same" class="different" data-value=\'same\'',
    );

    expect(found.map((match) => match.groups?.name)).toEqual([
      "id",
      "data-value",
    ]);
  });

  test("matches all supported attributes when no filters are supplied", () => {
    const found = matches(
      createAttributeRegExp(),
      'id="first" hidden data-state=\'ready\' aria-label="Open"',
    );

    expect(found.map((match) => match.groups?.name)).toEqual([
      "id",
      "hidden",
      "data-state",
      "aria-label",
    ]);
    expect(found.map((match) => match.groups?.value)).toEqual([
      "first",
      undefined,
      "ready",
      "Open",
    ]);
  });

  test("does not confuse a name with a prefix or suffix", () => {
    const found = matches(
      createAttributeRegExp("id"),
      'data-id="1" identity="2" id="3" id-extra="4"',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.value).toBe("3");
  });

  /**
   * INFO: This is a known limitation of matching attributes with regex only
   * TODO: Requires tokenizing complete attributes before filtering by name
   */
  test.skip("does not find an attribute-like substring inside another value", () => {
    const found = matches(
      createAttributeRegExp("id"),
      'title="look at id=\'fake\' here" id="real"',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.value).toBe("real");
  });

  // NOTE: Skipping this because we are not checking for syntax errors
  test.skip.each([
    ["an unquoted value", "data-id=42"],
    ["a missing assigned value", "data-id="],
    ["an unterminated double-quoted value", 'data-id="42'],
    ["an unterminated single-quoted value", "data-id='42"],
    ["a mismatched quote", "data-id='42\""],
  ])("does not match %s", (_label, source) => {
    expect(matches(createAttributeRegExp("data-id"), source)).toEqual([]);
  });

  test("treats the supplied name as data, not regex source", () => {
    expect(
      matches(createAttributeRegExp("id|class"), 'id="main" class="wide"'),
    ).toEqual([]);
  });

  test("can filter for an explicitly empty quoted value", () => {
    const found = matches(
      createAttributeRegExp("data-state", ""),
      'data-state="" data-state="ready"',
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.groups?.value).toBe("");
  });
});

describe("HTML attribute encoding and decoding", () => {
  test.each([
    ["plain text", "plain text", "plain text"],
    [
      "HTML-significant characters",
      'Tom & Jerry <Cartoon> "special"',
      "Tom &amp; Jerry &lt;Cartoon&gt; &quot;special&quot;",
    ],
    ["an empty value", "", ""],
  ])("encodes %s for a double-quoted attribute", (_label, input, expected) => {
    expect(encodeHtmlAttribute(input)).toBe(expected);
    expect(encodeHtmlAttribute(input, '"')).toBe(expected);
  });

  test("encodes only the active quote delimiter", () => {
    expect(encodeHtmlAttribute(`He said "it's fine"`, '"')).toBe(
      "He said &quot;it's fine&quot;",
    );
    expect(encodeHtmlAttribute(`He said "it's fine"`, "'")).toBe(
      'He said "it&apos;s fine"',
    );
  });

  test.each([
    [
      "named entities",
      "&amp;&AMP;&apos;&gt;&GT;&lt;&LT;&quot;&QUOT;",
      '&&\'>><<""',
    ],
    ["decimal entities", "&#65;&#128512;", "A😀"],
    ["hexadecimal entities", "&#x41;&#X1F600;", "A😀"],
    ["adjacent entities", "&lt;&lt;&amp;&amp;", "<<&&"],
  ])("decodes supported %s", (_label, input, expected) => {
    expect(decodeHtmlAttribute(input)).toBe(expected);
  });

  test.each(["&copy;", "&Amp;", "&amp", "&#xZZ;", "&#;", "ordinary & text"])(
    "leaves unsupported or malformed input unchanged: %s",
    (input) => {
      expect(decodeHtmlAttribute(input)).toBe(input);
    },
  );

  test("performs exactly one level of decoding", () => {
    expect(decodeHtmlAttribute("&amp;quot;")).toBe("&quot;");
  });

  test("round-trips ordinary developer-facing values", () => {
    const values = ["", "plain", "Tom & Jerry", '<tag title="x">', "😀"];

    for (const value of values) {
      expect(decodeHtmlAttribute(encodeHtmlAttribute(value))).toBe(value);
    }
  });
});

describe("HTML attribute parsing and stringification", () => {
  test.each([
    ["empty input", "", {}],
    ["whitespace only", " \n\t ", {}],
    [
      "boolean and quoted attributes",
      "disabled id=\"main\" data-state='ready'",
      { disabled: true, id: "main", "data-state": "ready" },
    ],
    [
      "empty values and entities",
      'value="" title="Tom &amp; Jerry"',
      { value: "", title: "Tom & Jerry" },
    ],
  ])("parses %s", (_label, source, expected) => {
    const parsed = parseHtmlAttributes(source);
    expect(parsed).toEqual(expected);
  });

  test("uses the first occurrence when a name is duplicated", () => {
    expect(parseHtmlAttributes('id="first" id="second"')).toEqual({
      id: "first",
    });
  });

  test("does not treat unsupported unquoted syntax as a valued attribute", () => {
    expect(parseHtmlAttributes("data-id=42")).not.toEqual({
      "data-id": "42",
    });
  });

  test.each([
    ["no attributes", {}, ""],
    ["a boolean attribute", { disabled: true }, " disabled"],
    ["a false boolean attribute", { hidden: false }, ""],
    ["an empty value", { value: "" }, ' value=""'],
    [
      "multiple and escapable values",
      { id: "main", title: 'Tom & Jerry "Special"' },
      ' id="main" title="Tom &amp; Jerry &quot;Special&quot;"',
    ],
  ] as const)("stringifies %s", (_label, attributes, expected) => {
    expect(stringifyHtmlAttributes(attributes)).toBe(expected);
  });

  test("round-trips the supported attribute model", () => {
    const attributes = {
      id: "main",
      disabled: true,
      hidden: false,
      title: 'Tom & Jerry says "hello"',
      empty: "",
    };

    expect(parseHtmlAttributes(stringifyHtmlAttributes(attributes))).toEqual({
      id: "main",
      disabled: true,
      title: 'Tom & Jerry says "hello"',
      empty: "",
    });
  });
});

describe(stringifyHtmlElement.name, () => {
  test.each([
    [
      "a paired element with omitted inner HTML",
      { tagName: "div" },
      "<div></div>",
    ],
    [
      "a paired element with undefined inner HTML",
      { tagName: "p", innerHtml: undefined },
      "<p></p>",
    ],
    [
      "a paired element with empty inner HTML",
      { tagName: "p", innerHtml: "" },
      "<p></p>",
    ],
    [
      "a void element with attributes",
      { tagName: "input", attributes: { disabled: true, value: "A&B" } },
      '<input disabled value="A&amp;B">',
    ],
    [
      "a paired element containing markup",
      { tagName: "p", attributes: { class: "lead" }, innerHtml: "<b>Hi</b>" },
      '<p class="lead"><b>Hi</b></p>',
    ],
  ] as const)("stringifies %s", (_label, element, expected) => {
    expect(stringifyHtmlElement(element)).toBe(expected);
  });
});

describe("finding HTML tags and elements", () => {
  test("finds multiple opening tags with consistent attributes", () => {
    const html = '<DIV id="one"><div hidden></div><divider></divider>';
    const found = findHtmlOpeningTags(html, "div");

    expect(found).toHaveLength(2);
    expect(found.map((element) => element.openingTag)).toEqual([
      '<DIV id="one">',
      "<div hidden>",
    ]);
    expect(found.map((element) => element.attributes)).toEqual([
      { id: "one" },
      { hidden: true },
    ]);
    for (const element of found) {
      expect(element.openingTag).toContain(element.attributesSource);
    }
  });

  test.each([
    ["attributes", '<div data-id="1" data-span="span">'],
    ["text content", "<div>this is a span text</div>"],
    ["prefixed tags", '<spanning span-attribute="span">'],
    ["custom tags", "<span-element />"],
    [
      "custom tags",
      "<span-element with-span-attr>and span text</span-element>",
    ],
  ])("returns empty array for absent element (%s)", (_label, source) => {
    expect(findHtmlOpeningTags(source, "span")).toEqual([]);
  });

  // NOTE: Skipping this because it is a known limitation
  test.skip("returns no opening tags for unsupported syntax", () => {
    expect(findHtmlOpeningTags("<div data-id=1>", "div")).toEqual([]);
  });

  test("identifies a complete paired element", () => {
    const html =
      'before <article id="story">Hello <b>world</b></article> after';

    expect(findHtmlElements(html, "article", true)).toEqual([
      {
        tagName: "article",
        attributes: { id: "story" },
        attributesSource: ' id="story"',
        openingTag: '<article id="story">',
        closingTag: "</article>",
        innerHtml: "Hello <b>world</b>",
        outerHtml: '<article id="story">Hello <b>world</b></article>',
      },
    ]);
  });

  test("identifies a void element without inventing paired metadata", () => {
    expect(
      findHtmlElements('before <img src="photo.jpg"> after', "img"),
    ).toEqual([
      {
        tagName: "img",
        attributes: { src: "photo.jpg" },
        attributesSource: ' src="photo.jpg"',
        openingTag: '<img src="photo.jpg">',
        outerHtml: '<img src="photo.jpg">',
      },
    ]);
  });

  test("never returns contradictory source metadata", () => {
    const html = "<section>one</section><section><b>two</b></section>";

    for (const element of findHtmlElements(html, "section", true)) {
      if (element.outerHtml !== undefined) {
        expect(html).toContain(element.outerHtml);
        expect(element.outerHtml.startsWith(element.openingTag)).toBe(true);
        expect(element.outerHtml.endsWith(element.closingTag ?? "")).toBe(true);
        expect(element.outerHtml).toBe(
          `${element.openingTag}${element.innerHtml ?? ""}${element.closingTag ?? ""}`,
        );
      }
    }
  });
});

describe(patchHtmlAttributes.name, () => {
  test.each([
    [
      "adds attributes without removing existing attributes",
      '<div id="main" hidden>',
      { title: "A&B" },
      '<div id="main" hidden title="A&amp;B">',
    ],
    [
      "overwrites specified attributes and preserves unspecified attributes",
      '<button type="button" class="old" disabled>',
      { class: "new", title: 'Say "hello"' },
      '<button type="button" class="new" disabled title="Say &quot;hello&quot;">',
    ],
    [
      "adds attributes to a tag without attributes",
      "<section>",
      { id: "intro", hidden: true },
      '<section id="intro" hidden>',
    ],
    [
      "removes a boolean attribute patched to false and preserves the rest",
      '<input name="email" required disabled>',
      { required: false },
      '<input name="email" disabled>',
    ],
    [
      "preserves self-closing syntax",
      '<x-card id="old" data-state="ready" />',
      { id: "new", hidden: true },
      '<x-card id="new" data-state="ready" hidden />',
    ],
  ] as const)("%s", (_label, openingTag, attributes, expected) => {
    expect(patchHtmlAttributes(openingTag, attributes)).toBe(expected);
  });

  test("is a no-op when the patch is empty", () => {
    const openingTag = "<div  id='main' disabled >";

    expect(patchHtmlAttributes(openingTag, {})).toBe(openingTag);
  });

  test("treats existing attribute names case-insensitively", () => {
    const result = patchHtmlAttributes('<div DATA-ID="old" class="card">', {
      "data-id": "new",
    });
    const attributes = parseHtmlAttributes(
      result.slice(result.indexOf(" ") + 1, result.lastIndexOf(">")),
    );
    const dataIdEntries = Object.entries(attributes).filter(
      ([name]) => name.toLowerCase() === "data-id",
    );

    expect(dataIdEntries).toHaveLength(1);
    expect(dataIdEntries[0]?.[1]).toBe("new");
    expect(attributes.class).toBe("card");
  });
});

describe(setHtmlAttributes.name, () => {
  test.each([
    [
      "replaces existing attributes",
      '<div id="old" hidden>',
      { id: "new", title: "A&B" },
      '<div id="new" title="A&amp;B">',
    ],
    ["adds attributes", "<div>", { hidden: true }, "<div hidden>"],
    ["removes all attributes", '<div id="old">', {}, "<div>"],
    [
      "preserves self-closing syntax",
      '<x-card id="old" />',
      { id: "new" },
      '<x-card id="new" />',
    ],
  ] as const)("%s", (_label, openingTag, attributes, expected) => {
    expect(setHtmlAttributes(openingTag, attributes)).toBe(expected);
  });

  test("produces attributes that public parsing reads back consistently", () => {
    const result = setHtmlAttributes('<button class="old">', {
      disabled: true,
      class: "new",
      title: 'Say "hello"',
    });
    const [element] = findHtmlOpeningTags(result, "button");

    expect(element?.attributes).toEqual({
      disabled: true,
      class: "new",
      title: 'Say "hello"',
    });
  });
});

describe("HTML rewriting", () => {
  test("replaces every matching opening tag exactly once", () => {
    const html = '<div id="one"></div><span></span><DIV id="two"></DIV>';
    const replacer = jest.fn(
      (element: { attributes: Record<string, string | boolean> }) =>
        `<section data-old-id="${String(element.attributes.id)}">`,
    );

    const result = replaceHtmlOpeningTags(html, "div", replacer);

    expect(result).toEqual({
      html: '<section data-old-id="one"></div><span></span><section data-old-id="two"></DIV>',
      replacedCount: 2,
    });
    expect(replacer).toHaveBeenCalledTimes(2);
  });

  // INFO: "no-op" here means "change nothing". This replacer does not do anything.
  test("does not counts no-op replacements as replacements", () => {
    const html = "<div></div><div></div>";
    const replacer = jest.fn(
      (element: { openingTag: string }) => element.openingTag,
    );

    expect(replaceHtmlOpeningTags(html, "div", replacer)).toEqual({
      html,
      replacedCount: 0,
    });
    expect(replacer).toHaveBeenCalledTimes(2);
  });

  test("does not recursively process markup returned by the replacer", () => {
    const replacer = jest.fn(() => "<div data-generated>");

    expect(replaceHtmlOpeningTags("<div></div>", "div", replacer)).toEqual({
      html: "<div data-generated></div>",
      replacedCount: 1,
    });
    expect(replacer).toHaveBeenCalledTimes(1);
  });

  test("returns an unchanged result when no opening tag matches", () => {
    const html = "<span></span>";
    const replacer = jest.fn(() => "replacement");

    expect(replaceHtmlOpeningTags(html, "div", replacer)).toEqual({
      html,
      replacedCount: 0,
    });
    expect(replacer).not.toHaveBeenCalled();
  });

  // WARNING: Whitespace-only inner HTML is intentionally treated as empty.
  // Webflow output and formatting may add whitespace to otherwise empty
  // Peakflow component placeholders.
  test("replaces elements with empty or whitespace-only inner HTML", () => {
    const html = "<i></i><i> </i><i>text</i><I></I>";
    const replacer = jest.fn(
      (_element: CompleteHtmlElement) => "<em>empty</em>",
    );

    expect(replaceEmptyHtmlElements(html, "i", replacer)).toEqual({
      html: "<em>empty</em><em>empty</em><i>text</i><em>empty</em>",
      replacedCount: 3,
    });
    expect(replacer).toHaveBeenCalledTimes(3);
    expect(replacer.mock.calls.map(([element]) => element.innerHtml)).toEqual([
      "",
      " ",
      "",
    ]);

    for (const [element] of replacer.mock.calls) {
      expect(element.outerHtml).toBe(
        `${element.openingTag}${element.innerHtml}${element.closingTag}`,
      );
    }
  });
});

describe("literal fragment removal and insertion", () => {
  test.each([
    ["an empty fragment list", "a.*b.*c", [], "a.*b.*c"],
    ["absent fragments", "abc", ["x", "y"], "abc"],
    ["all repeated literal fragments", "a.*b.*c", [".*"], "abc"],
    [
      "multiple distinct fragments",
      "one--two++three",
      ["--", "++"],
      "onetwothree",
    ],
    ["empty fragments", "abc", [""], "abc"],
  ] as const)("removes %s", (_label, html, fragments, expected) => {
    expect(removeHtmlFragments(html, fragments)).toBe(expected);
  });

  test.each([
    [
      "before every matching closing tag",
      "<div>one</div><DIV>two</DIV>",
      "div",
      "<hr>",
      "<div>one<hr></div><DIV>two<hr></DIV>",
    ],
    [
      "nowhere when the tag is absent",
      "<span>one</span>",
      "div",
      "<hr>",
      "<span>one</span>",
    ],
    [
      "nothing when markup is empty",
      "<div>one</div>",
      "div",
      "",
      "<div>one</div>",
    ],
  ])("inserts markup %s", (_label, html, tagName, markup, expected) => {
    expect(insertBeforeClosingHtmlTag(html, tagName, markup)).toBe(expected);
  });
});

describe(countHtmlElementsWithAttribute.name, () => {
  test.each([
    ["no occurrences", "<div></div>", "data-id", 0],
    [
      "boolean and valued occurrences",
      '<input disabled><button disabled="disabled"></button>',
      "disabled",
      2,
    ],
    [
      "case-insensitive exact names on one element",
      '<div DATA-ID="1" data-id="2" data-identity="3"></div>',
      "data-id",
      1,
    ],
    [
      "attribute-like text outside opening tags",
      '<div title="data-id=\'inside a value\'"></div> data-id="text"',
      "data-id",
      0,
    ],
  ])("counts %s", (_label, html, attributeName, expected) => {
    expect(countHtmlElementsWithAttribute(html, attributeName)).toBe(expected);
  });

  // WARNING: Opening-tag regexes currently also discover apparent tags inside
  // HTML comments. Fix comment handling at the shared matching layer so
  // discovery, counting, and replacement remain consistent.
  test.skip("does not count attribute-like text in a comment", () => {
    const html = '<!-- <div data-id="commented"> --><div></div>';

    expect(countHtmlElementsWithAttribute(html, "data-id")).toBe(0);
  });

  test("agrees with attributes exposed by opening-tag discovery", () => {
    const html =
      "<div data-track=\"a\"></div><DIV hidden data-track='b'></DIV>";
    const discoveredCount = findHtmlOpeningTags(html, "div").filter((element) =>
      Object.keys(element.attributes).some(
        (name) => name.toLowerCase() === "data-track",
      ),
    ).length;

    expect(countHtmlElementsWithAttribute(html, "data-track")).toBe(
      discoveredCount,
    );
  });
});
