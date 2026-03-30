document.addEventListener("DOMContentLoaded", () => {
  const portInput = document.getElementById("port") as HTMLInputElement;

  // Load saved port
  chrome.storage.local.get(["port"], (result) => {
    if (result.port) portInput.value = result.port.toString();
  });

  document.getElementById("save").addEventListener("click", () => {
    const port = parseInt(portInput.value, 10);

    chrome.storage.local.set({ port }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          // Send message to client.ts instead of reloading the whole tab
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "CONNECT_LIVERELOAD",
            port,
          });
        }
        window.close();
      });
    });
  });
});
