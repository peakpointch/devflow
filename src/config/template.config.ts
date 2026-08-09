import { defineConfig } from "peakflow/config";

export default defineConfig({
  /**
   * The GitHub repository of this project. Your code will be hosted via JSDelivr.
   */
  repository: {
    owner: "username",
    name: "project",
  },
  server: {
    webflowSubdomain: "YOUR_WEBFLOW_SUBDOMAIN",
    port: 3000,
    livereload: true,
    watchList: ["./src/"],
  },
  build: {
    modules: ["./src/app.ts"],
    outdir: "./dist",
  },
  environments: [
    /**
     * Add your own environments here. Accepted properties:
     * - name    : The name of the environment, e.g. "website"
     * - modules : The scripts that should be added to this environment, relative to your `outdir`. E.g. "app.js" will result in "dist/app.js"
     * - version : A fallback version for all modules. You can also set module specific versions in the `modules` property.
     * - pages   : An array of glob patterns. Define which pages of your Webflow site this environment should include.
     */
  ],
});
