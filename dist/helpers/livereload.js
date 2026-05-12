import { wf } from "peakflow/webflow";
import { dataset } from "./dataset.js";
import { routes } from "./routes.js";
class Livereload {
  static instance;
  socket;
  options = {
    port: 3e3,
    enabled: true
  };
  constructor() {
  }
  static getInstance() {
    if (!Livereload.instance) {
      Livereload.instance = new Livereload();
    }
    return Livereload.instance;
  }
  log(...message) {
    console.log(`[Dev Server]:`, ...message);
  }
  reload() {
    window.location.reload();
  }
  reloadCss(host) {
    if (!wf.doc) return;
    const links = wf.doc.querySelectorAll(
      `link[rel="stylesheet"][${dataset.attr.hmr}="true"]`
    );
    links.forEach((link) => {
      const { local } = dataset.parse(link);
      const url = new URL(`${host}/${local}`);
      url.searchParams.set("peakflow-t", Date.now().toString());
      link.href = url.toString();
    });
    this.log(
      `CSS Hot-Reloaded: ${links.length} ${links.length === 1 ? "file" : "files"}.`
    );
  }
  start() {
    const wsUrl = `ws://localhost:${this.options.port}${routes.livereload}`;
    const host = `http://localhost:${this.options.port}${routes.app}`;
    this.stop();
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => {
      if (event.data === "reload" && wf.env !== "designer") {
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
export {
  Livereload
};
