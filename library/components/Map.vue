<script setup>
import { onMounted } from "vue";
import { storetoRefs } from "pinia";

import { useInstanceStore } from "@/stores/instanceStore.js";
const { container } = storetoRefs(useInstanceStore());

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
    :id="`${container.value.id}-map`"
    style="height: 100%; width: 100%"
  ></div>
</template>
