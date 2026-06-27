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
  <!-- START Button -->
  <button
    :class="{ contrast: isActive }"
    :title="title"
    @click="$emit('click')"
  >
    <!-- START Icon -->
    <i v-if="icon" :class="`oi oi-${icon}`"></i>
    <!-- END Icon -->

    <!-- START Title -->
    &nbsp;{{ title }}
    <!-- END Title -->
  </button>
  <!-- END Button -->
</template>
