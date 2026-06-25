<script setup>
import { computed } from "vue";

const props = defineProps({
  instanceDocument: {
    type: Object,
    default: null,
  },
  waymarkEvents: {
    type: Array,
    default: () => [],
  },
});

const formattedInstanceDocument = computed(() => {
  if (!props.instanceDocument) {
    return "{}";
  }

  return JSON.stringify(props.instanceDocument, null, 2);
});

const formattedWaymarkEvents = computed(() => {
  if (!Array.isArray(props.waymarkEvents) || props.waymarkEvents.length === 0) {
    return "[]";
  }

  return JSON.stringify(props.waymarkEvents, null, 2);
});
</script>

<template>
  <section class="waymark-instance-shell-debug-content">
    <section>
      <h2>Instance document</h2>
      <pre>{{ formattedInstanceDocument }}</pre>
    </section>

    <section>
      <h2>Waymark events (last 25)</h2>
      <pre>{{ formattedWaymarkEvents }}</pre>
    </section>
  </section>
</template>

<style scoped>
.waymark-instance-shell-debug-content {
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.waymark-instance-shell-debug-content section {
  margin: 0;
  min-width: 0;
}

.waymark-instance-shell-debug-content h2 {
  margin: 0;
  padding: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
}

pre {
  margin: 0;
  padding: 0.5rem;
  max-width: 100%;
  max-height: 20vh;
  overflow: auto;
  border-radius: 0.25rem;
  box-sizing: border-box;
  font-size: 0.6875rem;
  line-height: 1.4;
  background: rgb(255 255 255 / 95%);
  pointer-events: auto;
}
</style>
