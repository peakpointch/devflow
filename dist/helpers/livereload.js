var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var livereload_exports = {};
__export(livereload_exports, {
  Livereload: () => Livereload
});
module.exports = __toCommonJS(livereload_exports);
var import_webflow = require("peakflow/webflow");
var import_selector = require("peakflow/selector");
var import_routes = require("./routes");
const dataset = import_selector.Dataset.define({
  hmr: import_selector.Dataset.Boolean("data-devflow-hmr"),
  local: import_selector.Dataset.String("data-devflow-local"),
  href: import_selector.Dataset.String("href")
});
class Livereload {
  constructor() {
  }
  static getInstance() {
    if (!Livereload.instance) {
      Livereload.instance = new Livereload();
    }
    return Livereload.instance;
  }
  log(...message) {
    console.log(`[Devflow]:`, ...message);
  }
  reload() {
    window.location.reload();
  }
  reloadCss(host) {
    if (!import_webflow.wf.doc) return;
    const links = import_webflow.wf.doc.querySelectorAll(
      `link[rel="stylesheet"][${dataset.attr.hmr}="true"]`
    );
    links.forEach((link) => {
      const { local } = dataset.parse(link);
      const url = new URL(`${host}/${local}`);
      url.searchParams.set("devflow-t", Date.now().toString());
      link.href = url.toString();
    });
    this.log(
      `CSS Hot-Reloaded: ${links.length} ${links.length === 1 ? "file" : "files"}.`
    );
  }
  start() {
    const wsUrl = `ws://localhost:${this.options.port}${import_routes.routes.livereload}`;
    const host = `http://localhost:${this.options.port}${import_routes.routes.app}`;
    this.stop();
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => {
      if (event.data === "reload" && import_webflow.wf.env !== "designer") {
        this.reload();
      } else if (event.data === "reload-css") {
        this.reloadCss(host);
      } else {
        this.log("Livereload: unknown event", event);
      }
    };
    this.socket.onerror = () => {
      this.log(`Waiting for local server on port ${this.options.port}...`);
    };
    this.socket.onclose = () => {
      if (this.options.enabled) {
        setTimeout(() => this.start(), 3e3);
      }
    };
  }
  stop() {
    this.options.enabled = false;
    if (this.socket) this.socket.close();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Livereload
});
