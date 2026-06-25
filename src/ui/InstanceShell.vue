<script setup>
import { computed } from "vue";
import InstanceShellModeDebug from "./modes/InstanceShellModeDebug.vue";
import InstanceShellModeView from "./modes/InstanceShellModeView.vue";

const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  instanceJSON: {
    type: Object,
    default: null,
  },
});

const modeComponent = computed(() => {
  if (props.mode === "debug") {
    return InstanceShellModeDebug;
  }

  return InstanceShellModeView;
});
</script>

<template>
  <aside class="waymark-instance-shell" aria-live="polite">
    <component :is="modeComponent" :key="mode" v-bind="{ instanceJSON }" />
  </aside>
</template>

<style scoped>
.waymark-instance-shell {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 1;
  max-width: min(32rem, calc(100% - 1rem));
  pointer-events: none;
}
</style>
