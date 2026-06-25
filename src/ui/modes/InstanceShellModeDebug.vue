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
  debugOutputVisible: {
    type: Boolean,
    default: true,
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
  <section
    v-if="debugOutputVisible"
    class="waymark-instance-shell-debug-panel"
    data-waymark-debug-panel="true"
  >
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
.waymark-instance-shell-debug-panel {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1;
  width: min(36rem, calc(100% - 1rem));
  margin: 0;
  padding: 0.5rem;
  display: grid;
  gap: 0.5rem;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 92%);
  pointer-events: auto;
}

.waymark-instance-shell-debug-panel section {
  margin: 0;
}

.waymark-instance-shell-debug-panel h2 {
  margin: 0;
  padding: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
}

pre {
  margin: 0;
  padding: 0.5rem;
  max-height: 20vh;
  overflow: auto;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
  background: rgb(255 255 255 / 95%);
  pointer-events: auto;
}
</style>
