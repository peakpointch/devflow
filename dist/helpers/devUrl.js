function normalizeDevBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("--base-url must be an absolute HTTP(S) origin.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.href !== `${url.origin}/`) {
    throw new Error("--base-url must be an absolute HTTP(S) origin.");
  }
  return url.origin;
}
function resolveDevUrlMode({
  baseUrl,
  relativeUrls = false
} = {}) {
  if (baseUrl !== void 0 && relativeUrls) {
    throw new Error("--base-url cannot be used with --relative-urls.");
  }
  if (baseUrl !== void 0) {
    return { baseUrl: normalizeDevBaseUrl(baseUrl), type: "base" };
  }
  return relativeUrls ? { type: "relative" } : { type: "localhost" };
}
function getDevServerUrl(config, path, { devUrlMode = { type: "localhost" } } = {}) {
  switch (devUrlMode.type) {
    case "relative":
      return path;
    case "base":
      return `${devUrlMode.baseUrl}${path}`;
    case "localhost":
      return `http://localhost:${config.devServer.port}${path}`;
  }
}
export {
  getDevServerUrl,
  normalizeDevBaseUrl,
  resolveDevUrlMode
};
