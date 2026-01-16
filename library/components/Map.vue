<script setup>
import { onMounted } from "vue";

import { useConfig } from "@/composables/useConfig.js";
const { config } = useConfig();

import { useMap } from "@/composables/useMap.js";
const { init } = useMap();

onMounted(() => {
  // Create Map
  init();
});
</script>

<template>
  <!-- Map -->
  <div
    class="map"
    :id="`${config.getMapOption('div_id')}-map`"
    style="height: 100%"
  ></div>
</template>

<style lang="less">
.map {
  width: 100%;
  height: 100%;
}
</style>
