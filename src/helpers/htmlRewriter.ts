import {
  escapeRegExp,
  groupRegExp,
  joinRegExp,
  optionalRegExp,
  strToRegExp,
} from "./regexp.js";
import { isEmptyObject } from "./utils.js";

export type HtmlAttributeValue = string | boolean;
export type HtmlAttributeQuote = '"' | "'";
export type HtmlAttributes = Record<string, HtmlAttributeValue>;

export interface HtmlOpeningTag {
  tagName: string;
  attributes: HtmlAttributes;
  attributesSource: string;
  openingTag: string;
  /**
   * The complete HTML source of the element when the opening tag represents a
   * void element.
   */
  outerHtml?: string;
}

export interface HtmlElement extends HtmlOpeningTag {
  /**
   * Closing tag is `undefined` if...
   * - the tagName represents a void element
   * - the opening tag is self-closing
   * - the exact closing tag can not be identified
   */
  closingTag?: string | undefined;
  innerHtml?: string;
  /**
   * The complete HTML source of the element, if its boundaries can be
   * identified reliably.
   *
   * This is possible for void elements and for paired elements whose actual
   * inner HTML does not contain a closing tag with the same tag name.
   */
  outerHtml?: string;
}

export interface CompleteHtmlElement extends HtmlElement {
  closingTag: string;
  innerHtml: string;
  outerHtml: string;
}

export interface StringifiableHtmlElement {
  tagName: HtmlElement["tagName"];
  attributes?: HtmlElement["attributes"];
  innerHtml?: HtmlElement["innerHtml"];
}

export interface HtmlRewriteResult {
  html: string;
  replacedCount: number;
}

type HtmlAttributeMatchGroups = {
  [K in keyof typeof htmlr.attribute.groups]?: string;
};

type HtmlEntityMatchGroups = {
  decimal?: string;
  hexadecimal?: string;
  named?: string;
};

type HtmlTagMatchGroups = {
  [K in keyof typeof htmlr.tag.groups]?: string;
};

const htmlr = {
  attribute: {
    nameStart: /(?<!\S)/,
    leadingWhitespace: /\s+/,
    nameEnd: /(?=\s*=|\s|>|$)/,
    name: /(?<name>[^\s=\/>]+)/,
    assign: /\s*=\s*/,
    /**
     * - unquoted values are intentionally not supported (because it's stupid)
     * - multiple groups may be a problem, this needs testing
     */
    value: /(?:(?<quote>")(?<value>[^"]*?)"|(?<quote>')(?<value>[^']*?)')/,
    // value: /(?:(?<quote>["'])(?<value>[^"']*?)\k<quote>)/,
    groups: {
      name: "name",
      value: "value",
      quote: "quote",
    },
  },
  entity:
    /&(?:#(?<decimal>\d+)|#[xX](?<hexadecimal>[\da-fA-F]+)|(?<named>amp|AMP|apos|gt|GT|lt|LT|quot|QUOT));/g,
  escape: {
    ampersand: /&/g,
    lessThan: /</g,
    greaterThan: />/g,
    doubleQuote: /"/g,
    singleQuote: /'/g,
  },
  tag: {
    openingStart: /</,
    openingEnd: /\s*(?<selfClosing>\/)?>/,
    closingStart: /<\//,
    closingEnd: /\s*>/,
    name: /[a-z][\w:-]*/,
    nameEnd: /(?=\s|>)/,
    attributes: /(?<attributes>(?:(?!\s*\/?\s*>)[^>])*)?/,
    innerHtml: /[\s\S]*?/,
    emptyInnerHtml: /\s*/,
    groups: {
      attributes: "attributes",
      closingTag: "closingTag",
      innerHtml: "innerHtml",
      openingTag: "openingTag",
      selfClosing: "selfClosing",
      tagName: "tagName",
    },
  },
} as const;

const htmlVoidTagNames = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function createOpeningTagRegExp(tagName?: string): RegExp {
  return joinRegExp(
    [
      htmlr.tag.openingStart,
      groupRegExp([tagName ? escapeRegExp(tagName) : htmlr.tag.name], {
        name: htmlr.tag.groups.tagName,
      }),
      htmlr.tag.nameEnd,
      htmlr.tag.attributes,
      htmlr.tag.openingEnd,
    ],
    "gi",
  );
}

export function createClosingTagRegExp(
  tagName?: string,
  captureTagName?: boolean, // WARNING: defaults to true, does this make sense?
): RegExp {
  const tagNamePattern = tagName ? strToRegExp(tagName) : htmlr.tag.name;
  return joinRegExp(
    [
      htmlr.tag.closingStart,
      captureTagName === false
        ? tagNamePattern
        : groupRegExp(tagNamePattern, { name: htmlr.tag.groups.tagName }),
      htmlr.tag.nameEnd,
      htmlr.tag.closingEnd,
    ],
    "gi",
  );
}

export function createPairedElementRegExp(
  tagName: string,
  innerPattern: RegExp,
): RegExp {
  const openingGroup = groupRegExp(createOpeningTagRegExp(tagName), {
    name: htmlr.tag.groups.openingTag,
  });
  const innerHtmlGroup = groupRegExp(innerPattern ?? htmlr.tag.emptyInnerHtml, {
    name: htmlr.tag.groups.innerHtml,
  });
  const closingGroup = groupRegExp(createClosingTagRegExp(tagName, false), {
    name: htmlr.tag.groups.closingTag,
  });
  return joinRegExp([openingGroup, innerHtmlGroup, closingGroup], "gi");
}

export function createAttributeRegExp(name?: string, value?: string): RegExp {
  const nameExpression = name
    ? groupRegExp([`(?i:${escapeRegExp(name)})`], {
        name: htmlr.attribute.groups.name,
      })
    : htmlr.attribute.name;

  let valueExpression: RegExp;

  if (value === undefined) {
    valueExpression = optionalRegExp([
      htmlr.attribute.assign,
      htmlr.attribute.value,
    ]);
  } else {
    const valueCapture = groupRegExp([escapeRegExp(value)], {
      name: htmlr.attribute.groups.value,
    });
    const quotedValueExpression = groupRegExp(
      [`(?<quote>["'])`, valueCapture, `\\k<quote>`],
      { nonCapturing: true },
    );

    valueExpression = joinRegExp([
      htmlr.attribute.assign,
      quotedValueExpression,
    ]);
  }

  return joinRegExp(
    [
      htmlr.attribute.nameStart,
      nameExpression,
      htmlr.attribute.nameEnd,
      valueExpression,
    ],
    "gv",
  );
}

// TODO: Can we delegate this?
export function decodeHtmlAttribute(value: string): string {
  return value.replace(htmlr.entity, (entity, ...captures: unknown[]) => {
    const groups = captures[captures.length - 1] as
      HtmlEntityMatchGroups | undefined;
    const decimal = groups?.decimal;
    const hexadecimal = groups?.hexadecimal;
    const named = groups?.named;

    if (decimal) {
      return String.fromCodePoint(Number.parseInt(decimal, 10));
    }

    if (hexadecimal) {
      return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
    }

    switch (named) {
      case "amp":
      case "AMP":
        return "&";
      case "apos":
        return "'";
      case "gt":
      case "GT":
        return ">";
      case "lt":
      case "LT":
        return "<";
      case "quot":
      case "QUOT":
        return '"';
      default:
        return entity;
    }
  });
}

// TODO: Can we delegate this?
export function encodeHtmlAttribute(
  value: string,
  quote: HtmlAttributeQuote = '"',
): string {
  return value
    .replace(htmlr.escape.ampersand, "&amp;")
    .replace(htmlr.escape.lessThan, "&lt;")
    .replace(htmlr.escape.greaterThan, "&gt;")
    .replace(
      quote === '"' ? htmlr.escape.doubleQuote : htmlr.escape.singleQuote,
      quote === '"' ? "&quot;" : "&apos;",
    );
}

export function parseHtmlAttributes(source: string): HtmlAttributes {
  const attributes: HtmlAttributes = {};
  const expression = createAttributeRegExp();

  for (const match of source.matchAll(expression)) {
    const groups = match.groups as HtmlAttributeMatchGroups | undefined;
    const name = groups?.name?.toLowerCase();
    const encodedValue = groups?.value;

    if (!name || name in attributes) {
      continue;
    }

    if (
      encodedValue === undefined || // WARNING: I removed "" from being interpreted as a boolean true
      encodedValue === "true"
    ) {
      attributes[name] = true;
    } else if (encodedValue === "false") {
      attributes[name] = false;
    } else {
      attributes[name] = decodeHtmlAttribute(encodedValue);
    }
  }

  return attributes;
}

export interface StringifyAttributesOptions {
  includeFalseAttributes?: boolean;
}

export function stringifyHtmlAttributes(
  attributes: HtmlAttributes,
  options: StringifyAttributesOptions = {},
): string {
  const parts = Object.entries(attributes).flatMap(([name, value]) => {
    if (value === false && !options.includeFalseAttributes) return [];
    if (value === true || value === false) return name;
    return `${name}="${encodeHtmlAttribute(String(value))}"`;
  });

  return parts.length ? ` ${parts.join(" ")}` : "";
}

export function stringifyHtmlElement({
  tagName,
  attributes = {},
  innerHtml,
}: StringifiableHtmlElement): string {
  const attrString = stringifyHtmlAttributes(attributes);
  const openingTag = `<${tagName}${attrString}>`;
  const isVoidElement = htmlVoidTagNames.has(tagName.toLowerCase());

  if (isVoidElement && innerHtml !== undefined) {
    throw new Error(`Void HTML element <${tagName}> cannot have inner HTML.`);
  }

  return isVoidElement
    ? openingTag
    : openingTag + (innerHtml ?? "") + `</${tagName}>`;
}

/**
 * @deprecated Use stringifyHtmlElement instead. This positional wrapper remains
 * until callers outside this module are migrated.
 */
export function createHtmlElement(
  tagName: string,
  attributes: HtmlAttributes = {},
  innerHtml?: string,
): string {
  return stringifyHtmlElement({ tagName, attributes, innerHtml });
}

export function findHtmlOpeningTags(
  html: string,
  tagName: string,
): HtmlOpeningTag[] {
  const expression = createOpeningTagRegExp(tagName);

  return [...html.matchAll(expression)].map((match) => {
    const groups = match.groups as HtmlTagMatchGroups | undefined;
    const attributesSource = groups?.attributes ?? "";
    const openingTag = match[0];
    const matchedTagName = groups?.tagName ?? tagName;

    return {
      tagName: matchedTagName,
      attributes: parseHtmlAttributes(attributesSource),
      attributesSource,
      openingTag,
      ...(htmlVoidTagNames.has(matchedTagName.toLowerCase())
        ? { outerHtml: openingTag }
        : {}),
    };
  });
}

export function findHtmlElements(
  html: string,
  tagName: string,
  paired = false,
): HtmlElement[] {
  if (!paired) {
    return findHtmlOpeningTags(html, tagName);
  }

  const expression = createPairedElementRegExp(tagName, htmlr.tag.innerHtml);

  return [...html.matchAll(expression)].map((match) => {
    const groups = match.groups as HtmlTagMatchGroups | undefined;
    const attributesSource = groups?.attributes ?? "";
    const innerHtml = groups?.innerHtml ?? "";
    const containsSameOpeningTag =
      createOpeningTagRegExp(tagName).test(innerHtml);
    const containsSameClosingTag =
      createClosingTagRegExp(tagName).test(innerHtml);
    const hasReliableBoundaries =
      !containsSameOpeningTag && !containsSameClosingTag;
    const closingTag = hasReliableBoundaries
      ? groups?.closingTag || undefined
      : undefined;

    return {
      tagName: groups?.tagName ?? tagName, // TODO: replace this with ! once we have tests for createPairedElementRegExp
      attributes: parseHtmlAttributes(attributesSource),
      attributesSource,
      innerHtml,
      openingTag: groups?.openingTag ?? "",
      closingTag,
      ...(hasReliableBoundaries ? { outerHtml: match[0] } : {}),
    };
  });
}

// IMPORTANT: patchHtmlAttributes should preserve existing attributes
export function patchHtmlAttributes(
  openingTag: string,
  attributes: HtmlAttributes,
): string {
  let transformedOpeningTag = openingTag;

  for (const [attributeName, value] of Object.entries(attributes)) {
    const expression = createAttributeRegExp(attributeName);
    const replacementExpression = joinRegExp(
      [htmlr.attribute.leadingWhitespace, expression],
      "gv",
    );
    const stringifiedAttribute = stringifyHtmlAttributes({
      [attributeName]: value,
    });

    // Replace all existing occurrences
    if (transformedOpeningTag.match(expression)) {
      transformedOpeningTag = transformedOpeningTag.replace(
        replacementExpression,
        stringifiedAttribute,
      );
      continue;
    }

    // Insert missing attributes at the end of the opening tag
    transformedOpeningTag = transformedOpeningTag.replace(
      htmlr.tag.openingEnd,
      (tagEnd) => stringifiedAttribute + tagEnd,
    );
  }

  return transformedOpeningTag;
}

export function setHtmlAttributes(
  openingTag: string,
  attributes: HtmlAttributes,
): string {
  const expression = createOpeningTagRegExp();
  const stringifiedAttributes = stringifyHtmlAttributes(attributes);

  return openingTag.replace(
    expression,
    (matchedOpeningTag, ...captures: unknown[]) => {
      const groups = captures[captures.length - 1] as
        HtmlTagMatchGroups | undefined;
      const tagName = groups?.tagName;

      if (!tagName) {
        return matchedOpeningTag;
      }

      const tagEnd = groups.selfClosing ? " />" : ">";
      return `<${tagName}${stringifiedAttributes}${tagEnd}`;
    },
  );
}

export function setHtmlAttribute(
  openingTag: string,
  attributeName: string,
  value: string | boolean,
): string {
  return patchHtmlAttributes(openingTag, { [attributeName]: value });
}

/**
 * @deprecated This function name is confusing and what it does is not helpful enough
 */
export function getFirstHtmlAttribute(
  html: string,
  tagName: string,
  attributeName: string,
): HtmlAttributeValue | undefined {
  return findHtmlOpeningTags(html, tagName)[0]?.attributes[attributeName];
}

/**
 * Replace HTML opening tags in a HTML string.
 *
 * INFO: Not implementing an "edit" version of this yet, because we cannot
 * reliably match the closing tag with regex only. It is open to discuss
 * wether `replacer` should keep returning a string or if returning an
 * object might be nicer.
 *
 */
export function replaceHtmlOpeningTags(
  html: string,
  tagName: string,
  replacer: (element: HtmlOpeningTag) => string,
): HtmlRewriteResult {
  let replacedCount = 0;
  const expression = createOpeningTagRegExp(tagName);

  const transformedHtml = html.replace(
    expression,
    (matchedOpeningTag, ...captures: unknown[]) => {
      const groups = captures[captures.length - 1] as
        HtmlTagMatchGroups | undefined;
      const attributesSource = groups?.attributes ?? "";
      const openingTag = matchedOpeningTag;
      const matchedTagName = groups?.tagName ?? tagName;
      const replacement = replacer({
        tagName: matchedTagName,
        attributes: parseHtmlAttributes(attributesSource),
        attributesSource,
        openingTag,
        ...(htmlVoidTagNames.has(matchedTagName.toLowerCase())
          ? { outerHtml: openingTag }
          : {}),
      });

      if (replacement !== openingTag) {
        replacedCount += 1;
      }

      return replacement;
    },
  );

  return { html: transformedHtml, replacedCount };
}

/**
 * Replace HTML elements that have no innerHtml in a HTML string.
 */
export function replaceEmptyHtmlElements(
  html: string,
  tagName: string,
  replacer: (element: CompleteHtmlElement) => string,
): HtmlRewriteResult {
  let replacedCount = 0;
  const expression = createPairedElementRegExp(
    tagName,
    htmlr.tag.emptyInnerHtml,
  );

  const transformedHtml = html.replace(
    expression,
    (outerHtml, ...captures: unknown[]) => {
      const groups = captures[captures.length - 1] as
        HtmlTagMatchGroups | undefined;
      if (!groups?.openingTag || !groups.closingTag) {
        throw new Error(
          `Could not identify the complete empty <${tagName}> element.`,
        );
      }

      const attributesSource = groups?.attributes ?? "";
      const matchedOuterHtml = outerHtml;
      const replacement = replacer({
        tagName: groups?.tagName ?? tagName,
        attributes: parseHtmlAttributes(attributesSource),
        attributesSource,
        innerHtml: groups?.innerHtml ?? "",
        openingTag: groups.openingTag,
        closingTag: groups.closingTag,
        // INFO: this is fine because we are matching empty elements here
        outerHtml: matchedOuterHtml,
      });

      if (replacement !== matchedOuterHtml) {
        replacedCount += 1;
      }

      return replacement;
    },
  );

  return { html: transformedHtml, replacedCount };
}

export function removeHtmlFragments(
  html: string,
  fragments: readonly string[],
): string {
  return fragments.reduce(
    (currentHtml, fragment) => currentHtml.replaceAll(fragment, ""),
    html,
  );
}

export function insertBeforeClosingHtmlTag(
  html: string,
  tagName: string,
  markup: string,
): string {
  const expression = createClosingTagRegExp(tagName);
  return html.replace(expression, (closingTag) => markup + closingTag);
}

export function countHtmlElementsWithAttribute(
  html: string,
  attributeName: string,
): number {
  const expression = createOpeningTagRegExp();
  const normalizedAttributeName = attributeName.toLowerCase();
  let count = 0;

  for (const match of html.matchAll(expression)) {
    const groups = match.groups as HtmlTagMatchGroups | undefined;
    const attributes = parseHtmlAttributes(groups?.attributes ?? "");

    if (Object.hasOwn(attributes, normalizedAttributeName)) {
      count += 1;
    }
  }

  return count;
}

/**
 * @deprecated BUT IT'S FASTER!
 */
export function countHtmlAttributeOccurrencesOld(
  html: string,
  attributeName: string,
): number {
  const expression = joinRegExp(
    [
      htmlr.tag.openingStart,
      htmlr.tag.name,
      htmlr.tag.nameEnd,
      optionalRegExp([htmlr.tag.attributes, htmlr.attribute.nameStart]),
      escapeRegExp(attributeName),
      htmlr.attribute.nameEnd,
    ],
    "gi",
  );

  return [...html.matchAll(expression)].length;
}
