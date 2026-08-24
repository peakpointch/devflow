export function addCssImportCacheBuster(
  css: string,
  timestamp: string,
): string {
  return css.replace(
    /(@import\s+(?:url\(\s*)?)(?:(['"])([^'"]+)\2|([^'")\s;]+))/gi,
    (match, prefix, quote, quotedUrl, unquotedUrl) => {
      const url = quotedUrl || unquotedUrl;

      if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) return match;

      const hashIndex = url.indexOf("#");
      const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
      const pathAndQuery = hashIndex === -1 ? url : url.slice(0, hashIndex);
      const separator = pathAndQuery.includes("?") ? "&" : "?";
      const cacheBustedUrl = `${pathAndQuery}${separator}peakflow-t=${timestamp}${hash}`;

      return `${prefix}${quote || ""}${cacheBustedUrl}${quote || ""}`;
    },
  );
}
