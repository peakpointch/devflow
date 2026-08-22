# HTML Rewriter Known Limitations

The HTML rewriter intentionally uses constrained string and regular-expression
matching instead of a complete HTML parser. Its test suite covers the supported
behavior extensively, but several skipped or commented-out cases document the
remaining boundaries below.

These limitations should not be fixed with isolated regex workarounds when the
underlying problem belongs to the shared matching model. Discovery, counting,
and replacement should continue to interpret the same source consistently.

## Limitations
### 1. Inner-pattern flags are not preserved

`createPairedElementRegExp` compiles the combined opening tag, inner pattern,
and closing tag with the flags `gi`.

This means:

- case-insensitivity is imposed even when the supplied inner pattern does not
  use `i`;
- a case-insensitive inner pattern appears to work, but only because the entire
  combined expression is case-insensitive; and
- flags such as `s`, `m`, `u`, `v`, `y`, and `d` are discarded. For example,
  `/first.*last/s` cannot retain its dot-all behavior across a newline.

Combining flags globally is not sufficient. Tag matching needs scoped
case-insensitivity, while the inner pattern must retain its own case behavior
and compatible flags.

### 2. Attribute matching lacks lexical context

Targeted attribute matching recognizes whitespace-delimited, attribute-shaped
substrings. It does not know whether the current position is already inside
another quoted attribute value.

For example, searching for `id` can find both the fake attribute and the real
attribute here:

```html
<div title="text id='fake'" id="real"></div>
```

A quote-parity lookaround would only move the problem to other combinations of
quotes and values. The robust direction is to tokenize complete attributes
sequentially and then filter those tokens by name and value.

### 3. Malformed assigned attributes degrade into booleans

The assignment and quoted-value portion of the attribute expression is
optional. If that portion cannot match, the expression can fall back to the
already matched name and interpret it as a boolean attribute.

This affects inputs such as:

```text
data-id=42
data-id=
data-id="42
data-id='42
data-id='42"
```

The intended grammar needs mutually exclusive alternatives:

- a boolean attribute whose name is followed by whitespace or the end of the
  attribute source; or
- an assigned attribute with a complete supported quoted value.

The boolean alternative must not remain available when `=` immediately follows
the name.

### 4. Opening-tag attributes are treated as opaque text

Opening-tag matching captures attribute source without validating that it is a
sequence of supported attribute tokens. Consequently:

- `>` inside a quoted value is mistaken for the end of the opening tag, so an
  opening tag such as `<article title='A > B'>` is truncated;
- unterminated single- or double-quoted values can still produce an opening-tag
  match;
- unsupported or malformed unquoted assignments can still be accepted during
  opening-tag discovery, even though attribute parsing does not support them;
  and
- paired-element matching inherits the same permissive opening-tag behavior.

This can lead to `findHtmlOpeningTags` discovering an element whose malformed
attribute source is later represented differently by `parseHtmlAttributes`.

Fixing these cases consistently requires either a quote-aware attribute-token
pattern or a small scanner shared by opening-tag discovery and paired-element
matching. If a particular unsupported syntax is intentionally tolerated rather
than rejected, its rejection expectation should not remain in the test suite.

### 5. HTML comments are not recognized

The shared opening-tag matcher scans raw strings without recognizing
`<!-- ... -->` regions. Apparent tags inside comments can therefore be
discovered, counted, or replaced:

```html
<!-- <div data-id="commented"></div> -->
```

This is not only a counting issue. Fixing `countHtmlElementsWithAttribute` in
isolation would make its results disagree with discovery and replacement.

A consistent fix should happen at the shared matching layer by skipping or
masking comment regions, or by tokenizing comments and tags together.

## Recommended order of work

1. Tokenize complete attributes before filtering them by name or value.
2. Reuse that tokenizer to validate and delimit opening-tag attribute source.
3. Preserve compatible inner-pattern flags with scoped case-insensitivity for
   tag syntax.
4. Add shared comment-region handling for discovery, counting, and replacement.

Until then, the skipped tests should remain as executable documentation of
these limitations rather than being weakened to mirror current behavior.
