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
  getDevServerUrl
};
