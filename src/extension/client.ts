import { wf } from "peakflow/webflow";
import { Livereload } from "../helpers/livereload";

declare global {
  interface Window {
    livereload: Livereload;
  }
}

function initialize(): void {
  if (typeof window === "undefined") return;

  if (wf.env === "designer") {
    chrome.storage.local.get(["port"], (result) => {
      setupAndStart((result.port as number) || 3000);
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "CONNECT_LIVERELOAD") {
        console.log(`[Devflow] Connecting to new port: ${message.port}`);
        setupAndStart(message.port);
      }
    });
  } else if (wf.env === "development") {
    setupAndStart(parseInt(window.location.port) || 3000);
  }
}

function setupAndStart(port: number) {
  const lr = Livereload.getInstance();
  lr.options = { port, enabled: true };
  lr.start();
  window.livereload = lr;
}

initialize();
