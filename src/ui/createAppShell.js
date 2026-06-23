import { createApp, h } from "vue";

/**
 * @param {string} containerId
 */
export function createAppShell(containerId) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const mountElement = document.createElement("div");
  mountElement.dataset.waymarkApp = "true";
  container.appendChild(mountElement);

  const app = createApp({
    name: "WaymarkInstanceApp",
    setup() {
      return () => h("div");
    },
  });

  app.mount(mountElement);

  return {
    app,
    mountElement,
  };
}
