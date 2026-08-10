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
   * Hosts server files
   */
  server: "/__server",

  /**
   * Webflow auth endpoint
   */
  wfAuth: "/.wf_auth",
};
