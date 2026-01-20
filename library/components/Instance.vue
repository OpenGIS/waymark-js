<script setup>
import { onMounted } from "vue";
import { ulid } from "ulid";

import { useMapLibreStore } from "@/stores/maplibre.js";
const { createMap } = useMapLibreStore();

import "maplibre-gl/dist/maplibre-gl.css";
import "@/assets/css/index.less";

const divID = `maplibre-${ulid()}`;

onMounted(() => {
	// Create MapLibre instance
	createMap(divID);
});
</script>

<template>
	<!-- Map Container -->
	<div :id="`${divID}`" style="height: 100%; width: 100%"></div>
</template>
