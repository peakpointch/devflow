document.addEventListener("DOMContentLoaded", () => {
  const portInput = document.getElementById("port") as HTMLInputElement;

  // Load saved port
  chrome.storage.local.get(["port"], (result) => {
    if (result.port) portInput.value = result.port as string;
  });

  document.getElementById("save").addEventListener("click", () => {
    const port = parseInt(portInput.value, 10);
    chrome.storage.local.set({ port }, () => {
      // Refresh the active tab to apply new port
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.reload(tabs[0].id);
        window.close();
      });
    });
  });
});
