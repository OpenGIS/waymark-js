<script setup>
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <section
    v-if="props.isVisible"
    class="waymark-instance-shell-modal"
    data-waymark-modal="true"
    role="dialog"
    aria-modal="false"
  >
    <slot />
  </section>
</template>

<style scoped>
.waymark-instance-shell-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  width: min(36rem, calc(100% - 1rem));
  max-height: calc(100% - 1rem);
  margin: 0;
  padding: 0.5rem;
  border-radius: 0.25rem;
  overflow: auto;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 0.5rem 1rem rgb(15 23 42 / 18%);
  pointer-events: auto;
}
</style>
