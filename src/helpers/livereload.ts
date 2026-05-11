import { wf } from "peakflow/webflow";
import { dataset } from "./dataset.js";
import { routes } from "./routes.js";

export interface LivereloadOptions {
  port: number;
  enabled: boolean;
}

export type WebflowEnv = "development" | "designer" | "staging" | "production";

export class Livereload {
  private static instance: Livereload | null;

  private socket: WebSocket | undefined;
  public options: LivereloadOptions = {
    port: 3000,
    enabled: true,
  };

  private constructor() {}

  static getInstance(): Livereload {
    if (!Livereload.instance) {
      Livereload.instance = new Livereload();
    }
    return Livereload.instance;
  }

  private log(...message: any[]) {
    console.log(`[Devflow]:`, ...message);
  }

  public reload() {
    window.location.reload();
  }

  public reloadCss(host: string) {
    if (!wf.doc) return;

    const links = wf.doc.querySelectorAll<HTMLLinkElement>(
      `link[rel="stylesheet"][${dataset.attr.hmr}="true"]`,
    );

    links.forEach((link) => {
      const { local } = dataset.parse(link);
      const url = new URL(`${host}/${local}`);
      url.searchParams.set("devflow-t", Date.now().toString());
      link.href = url.toString();
    });

    this.log(
      `CSS Hot-Reloaded: ${links.length} ${links.length === 1 ? "file" : "files"}.`,
    );
  }

  public start() {
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
      // Auto-reconnect loop
      if (this.options.enabled) {
        setTimeout(() => this.start(), 3000);
      }
    };
  }

  public stop() {
    this.options.enabled = false;
    if (this.socket) this.socket.close();
  }
}
