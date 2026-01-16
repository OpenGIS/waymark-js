import { createApp } from "vue";
import { createPinia } from "pinia";
import InstanceComponent from "../library/components/Instance.vue";
import { useMap } from "@/composables/useMap.js";
import { useInstanceStore } from "@/stores/instanceStore.js";

export class Instance {
	constructor(config = {}) {
		// Normalise configuration object
		config.map_options = {
			div_id: "waymark-instance",
			...(config.map_options || {}),
		};

		// Ensure we have a container
		if (!document.getElementById(config.map_options.div_id)) {
			const container = document.createElement("div");
			container.id = config.map_options.div_id;
			// Add dimensions
			container.style.height = "100%";
			document.body.appendChild(container);
		}

		// Create Vue App for this instance
		const app = createApp(InstanceComponent, config);

		// Add Pinia
		const pinia = createPinia();
		app.use(pinia);

		// Mount to DOM
		app.mount("#" + config.map_options.div_id);

		this.loadGeoJSON = useMap().loadGeoJSON;
		this.toGeoJSON = useMap().toGeoJSON;
		this.clearGeoJSON = useMap().clearGeoJSON;

		// Extract specific refs from the store
		const store = useInstanceStore();
		this.store = { map: store.map.value };
	}
}
