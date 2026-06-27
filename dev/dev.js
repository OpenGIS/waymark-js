import { createApp } from "vue";
import { createInstance } from "../src/entry.js";
import App from "./App.vue";

window.createWaymarkInstance = createInstance;

createApp(App).mount("#app");
