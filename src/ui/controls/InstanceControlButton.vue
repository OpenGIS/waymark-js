<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["click"]);
</script>

<template>
  <button
    type="button"
    class="waymark-instance-control-button"
    :class="{ 'waymark-instance-control-button--active': isActive }"
    :title="title"
    :aria-label="title"
    :aria-pressed="isActive ? 'true' : 'false'"
    @click="$emit('click')"
  >
    <span
      v-if="icon"
      class="waymark-instance-control-button__icon"
      aria-hidden="true"
    >
      {{ icon }}
    </span>
    <span class="waymark-instance-control-button__title">{{ title }}</span>
  </button>
</template>

<style scoped>
.waymark-instance-control-button {
  margin: 0;
  padding: 0.375rem 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid rgb(17 24 39 / 25%);
  border-radius: 0.25rem;
  color: rgb(17 24 39);
  font: inherit;
  font-size: 0.6875rem;
  line-height: 1.2;
  background: rgb(255 255 255 / 92%);
  cursor: pointer;
}

.waymark-instance-control-button--active {
  border-color: rgb(37 99 235 / 40%);
  background: rgb(239 246 255 / 95%);
}

.waymark-instance-control-button__icon {
  line-height: 1;
}
</style>
