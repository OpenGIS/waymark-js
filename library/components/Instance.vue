<script setup>
import { onMounted } from "vue";
import { mapOptions } from "@/helpers/MapLibre.js";
import { ulid } from "ulid";
import { Map } from "maplibre-gl";

import { useMapLibreStore } from "@/stores/maplibre.js";
const { setMap } = useMapLibreStore();

import "maplibre-gl/dist/maplibre-gl.css";
import "@/assets/css/index.less";

const divID = `maplibre-${ulid()}`;

onMounted(() => {
	// Create MapLibre instance
	setMap(
		new Map({
			container: divID,
			...mapOptions,
		}),
	);
});
</script>

<template>
	<!-- Map Container -->
	<div :id="`${divID}`" style="height: 100%; width: 100%"></div>
</template>
