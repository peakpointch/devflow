import { wf } from "peakflow/webflow";
import { Livereload } from "../helpers/livereload";

declare global {
  interface Window {
    livereload: Livereload;
  }
}

function initialize(): void {
  if (typeof window === "undefined") return;

  const livereload = Livereload.getInstance();

  if (wf.env === "designer") {
    chrome.storage.local.get(["port"], (result) => {
      const livereload = Livereload.getInstance();

      livereload.options = {
        port: (result.port as number) || 3000,
        enabled: true,
      };

      livereload.start();
    });
  } else if (wf.env === "development") {
    livereload.options = {
      port: parseInt(window.location.port) || 3000,
      enabled: true,
    };

    livereload.start();
  }

  window.livereload = livereload;
}

initialize();
