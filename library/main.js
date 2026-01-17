import { createApp } from "vue";
import { createPinia } from "pinia";
import Entry from "../library/Entry.vue";

export class Instance {
	constructor(divId = "waymark-instance", geoJSON = {}) {
		// Get the container div
		const container = document.getElementById(divId);
		if (!container) {
			console.error("[Waymark] Could not find container in DOM");
		}

		// Add dimensions
		container.style.height = "100%";
		container.style.width = "100%";

		// Create Vue App for this instance
		const app = createApp(Entry, {
			geoJSON,
		});

		// Add Pinia
		const pinia = createPinia();
		app.use(pinia);

		// Mount to DOM
		app.mount("#" + divId);
	}
}
