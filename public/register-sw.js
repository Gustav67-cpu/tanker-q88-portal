// Tanker Q88 Portal — register the service worker if supported.
(function () {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch(function (err) {
        // eslint-disable-next-line no-console
        console.warn("[sw] registration failed:", err);
      });
  });
})();
