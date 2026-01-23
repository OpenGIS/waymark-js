<script setup>
import { onMounted, inject } from "vue";
import { ulid } from "ulid";

const { createMap } = inject("mapLibre");

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
