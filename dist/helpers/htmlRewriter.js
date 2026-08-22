import {
  escapeRegExp,
  groupRegExp,
  joinRegExp,
  optionalRegExp,
  strToRegExp
} from "./regexp.js";
const htmlr = {
  attribute: {
    nameStart: /(?<!\S)/,
    nameEnd: /(?=\s*=|\s|>|$)/,
    name: /(?<name>[^\s=\/>]+)/,
    assign: /\s*=\s*/,
    /**
     * - unquoted values are intentionally not supported (because it's stupid)
     * - multiple groups may be a problem, this needs testing
     */
    value: /(?:(?<quote>")(?<value>[^"]*)"|(?<quote>')(?<value>[^']*)'|)/,
    groups: {
      name: "name",
      value: "value",
      quote: "quote"
    }
  },
  entity: /&(?:#(?<decimal>\d+)|#[xX](?<hexadecimal>[\da-fA-F]+)|(?<named>amp|AMP|apos|gt|GT|lt|LT|quot|QUOT));/g,
  escape: {
    ampersand: /&/g,
    lessThan: /</g,
    greaterThan: />/g,
    doubleQuote: /"/g,
    singleQuote: /'/g
  },
  tag: {
    openingStart: /</,
    openingEnd: /\s*(?<selfClosing>\/?)>/,
    closingStart: /<\//,
    closingEnd: /\s*>/,
    name: /[a-z][\w:-]*\b/,
    attributes: /(?<attributes>[^>]*)?/,
    // This may consume self closing tags, this needs testing
    innerHtml: /[\s\S]*?/,
    emptyInnerHtml: /\s*/,
    groups: {
      attributes: "attributes",
      closingTag: "closingTag",
      innerHtml: "innerHtml",
      openingTag: "openingTag",
      selfClosing: "selfClosing",
      tagName: "tagName"
    }
  }
};
const htmlVoidTagNames = /* @__PURE__ */ new Set([
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
  "wbr"
]);
function createOpeningTagRegExp(tagName) {
  return joinRegExp(
    [
      htmlr.tag.openingStart,
      groupRegExp(
        [tagName ? escapeRegExp(tagName) + /\b/.source : htmlr.tag.name],
        { name: htmlr.tag.groups.tagName }
      ),
      htmlr.tag.attributes,
      htmlr.tag.openingEnd
    ],
    "gi"
  );
}
function createClosingTagRegExp(tagName) {
  return joinRegExp(
    [
      htmlr.tag.closingStart,
      tagName ? strToRegExp(tagName) : htmlr.tag.name,
      htmlr.tag.closingEnd
    ],
    "gi"
  );
}
function createPairedElementRegExp(tagName, innerPattern) {
  const openingGroup = groupRegExp(createOpeningTagRegExp(tagName), {
    name: htmlr.tag.groups.openingTag
  });
  const innerHtmlGroup = groupRegExp(innerPattern ?? htmlr.tag.emptyInnerHtml, {
    name: htmlr.tag.groups.innerHtml
  });
  const closingGroup = groupRegExp(createClosingTagRegExp(tagName), {
    name: htmlr.tag.groups.closingTag
  });
  return joinRegExp([openingGroup, innerHtmlGroup, closingGroup], "gi");
}
function createAttributeRegExp(name, value) {
  return joinRegExp(
    [
      htmlr.attribute.nameStart,
      name ? `(?i:${escapeRegExp(name)})` : htmlr.attribute.name,
      htmlr.attribute.nameEnd,
      optionalRegExp([
        htmlr.attribute.assign,
        value !== void 0 ? escapeRegExp(value) : htmlr.attribute.value
      ])
    ],
    "gv"
  );
}
function decodeHtmlAttribute(value) {
  return value.replace(htmlr.entity, (entity, ...captures) => {
    const groups = captures[captures.length - 1];
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
function encodeHtmlAttribute(value, quote = '"') {
  return value.replace(htmlr.escape.ampersand, "&amp;").replace(htmlr.escape.lessThan, "&lt;").replace(htmlr.escape.greaterThan, "&gt;").replace(
    quote === '"' ? htmlr.escape.doubleQuote : htmlr.escape.singleQuote,
    quote === '"' ? "&quot;" : "&#39;"
  );
}
function parseHtmlAttributes(source) {
  const attributes = {};
  const expression = createAttributeRegExp();
  for (const match of source.matchAll(expression)) {
    const groups = match.groups;
    const name = groups?.name?.toLowerCase();
    const encodedValue = groups?.value ?? "";
    if (!name) {
      continue;
    }
    if (encodedValue === void 0 || encodedValue === "" || encodedValue === "true") {
      attributes[name] = true;
    } else if (encodedValue === "false") {
      attributes[name] = false;
    } else {
      attributes[name] = decodeHtmlAttribute(encodedValue);
    }
  }
  return attributes;
}
function stringifyHtmlAttributes(attributes) {
  return Object.entries(attributes).map(([name, value]) => {
    return value === true ? name : `${name}="${encodeHtmlAttribute(String(value))}"`;
  }).join(" ");
}
function stringifyHtmlElement({
  tagName,
  attributes = {},
  innerHtml
}) {
  const attrString = stringifyHtmlAttributes(attributes);
  const openingTag = `<${tagName}${attrString ? ` ${attrString}` : ""}>`;
  const isVoidElement = htmlVoidTagNames.has(tagName.toLowerCase());
  if (isVoidElement && innerHtml !== void 0) {
    throw new Error(`Void HTML element <${tagName}> cannot have inner HTML.`);
  }
  return isVoidElement ? openingTag : openingTag + (innerHtml ?? "") + "</" + tagName + ">";
}
function createHtmlElement(tagName, attributes = {}, innerHtml) {
  return stringifyHtmlElement({ tagName, attributes, innerHtml });
}
function findHtmlOpeningTags(html, tagName) {
  const expression = createOpeningTagRegExp(tagName);
  return [...html.matchAll(expression)].map((match) => {
    const groups = match.groups;
    const attributesSource = groups?.attributes ?? "";
    const openingTag = match[0];
    const matchedTagName = groups?.tagName ?? tagName;
    return {
      tagName: matchedTagName,
      attributes: parseHtmlAttributes(attributesSource),
      attributesSource,
      openingTag,
      ...htmlVoidTagNames.has(matchedTagName.toLowerCase()) ? { outerHtml: openingTag } : {}
    };
  });
}
function findHtmlElements(html, tagName, paired = false) {
  if (!paired) {
    return findHtmlOpeningTags(html, tagName);
  }
  const expression = createPairedElementRegExp(tagName, htmlr.tag.innerHtml);
  return [...html.matchAll(expression)].map((match) => {
    const groups = match.groups;
    const attributesSource = groups?.attributes ?? "";
    const innerHtml = groups?.innerHtml ?? "";
    const containsSameOpeningTag = createOpeningTagRegExp(tagName).test(innerHtml);
    const containsSameClosingTag = createClosingTagRegExp(tagName).test(innerHtml);
    const hasReliableBoundaries = !containsSameOpeningTag && !containsSameClosingTag;
    const closingTag = hasReliableBoundaries ? groups?.closingTag || void 0 : void 0;
    return {
      tagName: groups?.tagName ?? tagName,
      // TODO: replace this with ! once we have tests for createPairedElementRegExp
      attributes: parseHtmlAttributes(attributesSource),
      attributesSource,
      innerHtml,
      openingTag: groups?.openingTag ?? "",
      closingTag,
      ...hasReliableBoundaries ? { outerHtml: match[0] } : {}
    };
  });
}
function setHtmlAttributes(openingTag, attributes) {
  let transformedOpeningTag = openingTag;
  for (const [attributeName, value] of Object.entries(attributes)) {
    const expression = createAttributeRegExp(attributeName);
    const stringifiedAttribute = stringifyHtmlAttributes({
      [attributeName]: value
    });
    if (transformedOpeningTag.match(expression)) {
      transformedOpeningTag = transformedOpeningTag.replace(
        expression,
        stringifiedAttribute
      );
      continue;
    }
    transformedOpeningTag = transformedOpeningTag.replace(
      htmlr.tag.openingEnd,
      (_tagEnd, ...captures) => {
        const groups = captures[captures.length - 1];
        const selfClosing = groups?.selfClosing ?? "";
        return ` ${stringifiedAttribute}${selfClosing}>`;
      }
    );
  }
  return transformedOpeningTag;
}
function setHtmlAttribute(openingTag, attributeName, value) {
  return setHtmlAttributes(openingTag, { [attributeName]: value });
}
function getFirstHtmlAttribute(html, tagName, attributeName) {
  return findHtmlOpeningTags(html, tagName)[0]?.attributes[attributeName];
}
function replaceHtmlOpeningTags(html, tagName, replacer) {
  let replacedCount = 0;
  const expression = createOpeningTagRegExp(tagName);
  const transformedHtml = html.replace(
    expression,
    (matchedOpeningTag, ...captures) => {
      const groups = captures[captures.length - 1];
      const attributesSource = groups?.attributes ?? "";
      const openingTag = matchedOpeningTag;
      const matchedTagName = groups?.tagName ?? tagName;
      const replacement = replacer({
        tagName: matchedTagName,
        attributes: parseHtmlAttributes(attributesSource),
        attributesSource,
        openingTag,
        ...htmlVoidTagNames.has(matchedTagName.toLowerCase()) ? { outerHtml: openingTag } : {}
      });
      if (replacement !== openingTag) {
        replacedCount += 1;
      }
      return replacement;
    }
  );
  return { html: transformedHtml, replacedCount };
}
function replaceEmptyHtmlElements(html, tagName, replacer) {
  let replacedCount = 0;
  const expression = createPairedElementRegExp(
    tagName,
    htmlr.tag.emptyInnerHtml
  );
  const transformedHtml = html.replace(
    expression,
    (outerHtml, ...captures) => {
      const groups = captures[captures.length - 1];
      if (!groups?.openingTag || !groups.closingTag) {
        throw new Error(
          `Could not identify the complete empty <${tagName}> element.`
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
        outerHtml: matchedOuterHtml
      });
      if (replacement !== matchedOuterHtml) {
        replacedCount += 1;
      }
      return replacement;
    }
  );
  return { html: transformedHtml, replacedCount };
}
function removeHtmlFragments(html, fragments) {
  return fragments.reduce(
    (currentHtml, fragment) => currentHtml.replaceAll(fragment, ""),
    html
  );
}
function insertBeforeClosingHtmlTag(html, tagName, markup) {
  const expression = createClosingTagRegExp(tagName);
  return html.replace(expression, markup + "</" + tagName + ">");
}
function countHtmlAttributeOccurrences(html, attributeName) {
  const expression = createOpeningTagRegExp();
  const normalizedAttributeName = attributeName.toLowerCase();
  let count = 0;
  for (const match of html.matchAll(expression)) {
    const groups = match.groups;
    const attributes = parseHtmlAttributes(groups?.attributes ?? "");
    if (Object.hasOwn(attributes, normalizedAttributeName)) {
      count += 1;
    }
  }
  return count;
}
function countHtmlAttributeOccurrencesOld(html, attributeName) {
  const expression = joinRegExp(
    [
      htmlr.tag.openingStart,
      htmlr.tag.name,
      optionalRegExp([htmlr.tag.attributes, htmlr.attribute.nameStart]),
      escapeRegExp(attributeName),
      htmlr.attribute.nameEnd
    ],
    "gi"
  );
  return [...html.matchAll(expression)].length;
}
export {
  countHtmlAttributeOccurrences,
  countHtmlAttributeOccurrencesOld,
  createAttributeRegExp,
  createClosingTagRegExp,
  createHtmlElement,
  createOpeningTagRegExp,
  createPairedElementRegExp,
  decodeHtmlAttribute,
  encodeHtmlAttribute,
  findHtmlElements,
  findHtmlOpeningTags,
  getFirstHtmlAttribute,
  insertBeforeClosingHtmlTag,
  parseHtmlAttributes,
  removeHtmlFragments,
  replaceEmptyHtmlElements,
  replaceHtmlOpeningTags,
  setHtmlAttribute,
  setHtmlAttributes,
  stringifyHtmlAttributes,
  stringifyHtmlElement
};
