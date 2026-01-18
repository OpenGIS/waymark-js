import { createApp } from "vue";
import { createPinia } from "pinia";
import { useInstanceStore } from "@/stores/instanceStore.js";
import Entry from "../library/Entry.vue";

export class Instance {
	constructor(divId = "waymark-instance", geoJSON = {}) {
		// Get the container div
		const container = document.getElementById(divId);
		if (!container) {
			console.error("[Waymark] Could not find container in DOM");
		}

		// Add ID
		container.id = divId;

		// Add dimensions
		container.style.height = "100%";
		container.style.width = "100%";

		// Create Pinia
		const pinia = createPinia();

		// Create Vue App for this instance
		const app = createApp(Entry);
		app.use(pinia);

		// Use Instance Store
		const { setGeoJSON, setContainer } = useInstanceStore();
		setContainer(container);
		setGeoJSON(geoJSON);

		// Mount to DOM
		app.mount("#" + divId);
	}
}
