import { defineConfig } from "peakflow/config";
var template_config_ts_default = defineConfig({
  repository: {
    owner: "username",
    name: "project"
  },
  server: {
    webflowSubdomain: "YOUR_WEBFLOW_SUBDOMAIN",
    port: 3e3,
    livereload: true,
    watchList: ["./src/"]
  },
  build: {
    modules: ["./src/app.ts"],
    outdir: "./dist"
  },
  environments: {
    /* Add your own environments here. Learn more running 'peakflow help config' */
  }
});
export {
  template_config_ts_default as default
};
