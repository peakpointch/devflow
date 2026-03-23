"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReloadScript = getReloadScript;
const devflow_1 = require("../devflow");
function getReloadScript(config) {
    return config.livereload
        ? `<script>
  if ("WebSocket" in window) {
    (function () {
      const devflowLivereloadURL =
        "ws://localhost:${config.port}${devflow_1.routes.livereload}";
      const socket = new WebSocket(devflowLivereloadURL);
      socket.onmessage = function (event) {
        if (event.data === "reload") {
          window.location.reload();
        } else if (event.data === "reload-css"){
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"][data-dyn-css="true"]');
          console.log("RELOAD CSS");
          stylesheets.forEach((sheet) => {
            const url = new URL(sheet.href);
            url.searchParams.set("t", Date.now().toString());
            sheet.href = url.toString();
          });
        } else console.log(event);
      };
    })();
  }
  </script>`
        : "";
}
