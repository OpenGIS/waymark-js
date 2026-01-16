<script setup>
import { computed } from "vue";

import { storeToRefs } from "pinia";

import { useInstanceStore } from "@/stores/instanceStore.js";
import { useConfig } from "@/composables/useConfig.js";

const instanceStore = useInstanceStore();
const { config } = useConfig();
const { mapReady, container, panelOpen, activeOverlay } =
	storeToRefs(instanceStore);

import "@/assets/css/index.less";

import Map from "@/components/Map.vue";
// import UI from "@/components/UI/UI.vue";

const props = defineProps({
	map_options: {
		type: Object,
		default: () => ({}),
	},
	viewer_options: {
		type: Object,
		default: () => ({}),
	},
});

// Initialise Instance Store
instanceStore.init(props);

// Get container
container.value = document.getElementById(
	`${config.value.getMapOption("div_id")}`,
);

const classAppend = computed(() => {
	let classes = [""];

	// Panel Open
	if (panelOpen.value) {
		classes.push("panel-open");
	} else {
		classes.push("panel-closed");
	}

	// Orientation
	if (container.value.clientWidth > container.value.clientHeight) {
		classes.push("orientation-landscape");
	} else {
		classes.push("orientation-portrait");
	}

	// Narrow display
	if (container.value.clientWidth <= 375) {
		classes.push("display-narrow");
	}

	// Short display
	if (container.value.clientHeight <= 375) {
		classes.push("display-short");
	}

	// Has active layer
	if (activeOverlay.value) {
		classes.push("has-active-overlay");
	}

	// Small / Medium / Large
	if (container.value.clientWidth <= 640) {
		classes.push("size-small");
	} else if (
		container.value.clientWidth > 640 &&
		container.value.clientWidth <= 1024
	) {
		classes.push("size-medium");
	} else {
		classes.push("size-large");
	}

	return classes.join(" ");
});
</script>

<template>
	<!-- Instance -->
	<div
		:class="`instance ${classAppend}`"
		:id="`${config.map_options.div_id}-instance`"
	>
		<Map />

		<!-- <UI v-if="mapReady" /> -->
	</div>
</template>

<style lang="less">
.instance {
	height: 100%;
	width: 100%;
	display: flex;
	overflow: hidden;

	/* Transitions */
	.map,
	.ui {
		transition: width 0.25s ease-in-out;
		transition: height 0.25s ease-in-out;
	}

	.map {
		// width: calc(100% - 44px);
		width: 100%;
		height: 100%;
	}

	.ui {
		width: 44px;
		height: 100%;
	}

	&.panel-open {
		.map {
			width: calc(100% - 320px);
		}

		.ui {
			width: 320px;
		}
	}

	&.display-narrow {
		flex-direction: column;

		&.panel-open {
			.map {
				width: 100%;
				height: calc(100% - 480px);
			}

			.ui {
				width: 100%;
				// height: 480px;
			}

			&.has-active-overlay {
				.ui {
					height: 400px;
				}
			}
		}
	}
}
</style>
