function getDevServerUrl(config, path, { relativeUrls = false } = {}) {
  return relativeUrls ? path : `http://localhost:${config.devServer.port}${path}`;
}
export {
  getDevServerUrl
};
