<script setup>
import { computed } from "vue";

const props = defineProps({
  debugPayload: {
    type: Object,
    default: null,
  },
});

const formattedDebugPayload = computed(() => {
  if (!props.debugPayload) {
    return "{}";
  }

  return JSON.stringify(props.debugPayload, null, 2);
});
</script>

<template>
  <details open>
    <summary>Instance debug payload</summary>
    <pre>{{ formattedDebugPayload }}</pre>
  </details>
</template>

<style scoped>
details {
  margin: 0;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 90%);
}

summary {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
  pointer-events: auto;
}

pre {
  margin: 0;
  padding: 0.5rem;
  max-height: 40vh;
  overflow: auto;
  border-radius: 0 0 0.25rem 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
  background: rgb(255 255 255 / 92%);
  pointer-events: auto;
}
</style>
