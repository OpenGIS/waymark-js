<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { mapOptions } from "@/helpers/MapLibre.js";

import { useInstanceStore } from "@/stores/instanceStore.js";
const instanceStore = useInstanceStore();
const { container, map } = storeToRefs(instanceStore);

import { useMap } from "@/composables/useMap.js";
const { addListeners } = useMap();

import "@/assets/css/index.less";

onMounted(() => {
	// Create MapLibre instance
	map.value = new Map({
		container: `${container.value.id}-map`,
		...mapOptions,
	});

	// Add event listeners
	addListeners(map.value);
});
</script>

<template>
	{{ container.id }}

	<!-- Map Container -->
	<div :id="`${container.id}-map`" style="height: 100%; width: 100%"></div>
</template>
