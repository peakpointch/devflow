import { defineConfig } from "peakflow/config";

export default defineConfig({
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
    /* Add your own environments here. Learn more running 'peakflow help config' */
  ],
});
