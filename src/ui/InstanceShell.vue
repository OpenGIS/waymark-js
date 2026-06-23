<script setup>
import { computed } from "vue";

const props = defineProps({
  snapshot: {
    type: Object,
    default: null,
  },
});

const formattedSnapshot = computed(() => {
  if (!props.snapshot) {
    return "{}";
  }

  return JSON.stringify(props.snapshot, null, 2);
});
</script>

<template>
  <aside class="waymark-instance-shell" aria-live="polite">
    <details open>
      <summary>Instance snapshot</summary>
      <pre>{{ formattedSnapshot }}</pre>
    </details>
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
