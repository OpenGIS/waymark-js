<script setup>
import { computed } from "vue";

import { storeToRefs } from "pinia";

import { useInstanceStore } from "@/stores/instanceStore.js";

const instanceStore = useInstanceStore();
const { container, activeOverlay } = storeToRefs(instanceStore);

import "@/assets/css/index.less";

import Map from "@/components/Map.vue";

const props = defineProps({
	geoJSON: {
		type: Object,
		default: () => ({
			type: "FeatureCollection",
			features: [],
		}),
	},
});

// Initialise Instance Store
instanceStore.init(props);
</script>

<template>
	<!-- Map Container -->
	<div
		:id="`${container.value.id}-map`"
		style="height: 100%; width: 100%"
	></div>
</template>
