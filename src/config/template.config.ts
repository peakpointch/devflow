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
     * Add your own publishing environments here.
     *
     * - name    : The name of the environment.
     * - modules : The built modules (files) included in the environment. Use `peakflow build` to build your modules.
     * - version : The version associated with the environment, used as a fallback for all modules.
     * - pages   : Page patterns (literal path, Glob, ExtGlob). Define which pages of your Webflow site this environment applies to.
     * - skip    : Optional: Skip this environment when publishing it.
     */
  ],
});
