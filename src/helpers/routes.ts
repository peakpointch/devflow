/**
 * Custom routes that are not mirrored from Webflow by the proxy.
 */
export const routes = {
  /**
   * Livereload WebSocket endpoint
   */
  livereload: "/__livereload",

  /**
   * Hosts project files
   */
  app: "/__app",

  /**
   * Hosts devflow files
   */
  devflow: "/__devflow",
};
