<script setup>
import { computed } from "vue";

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
  sizePX: {
    type: Number,
    default: 48,
  },
  color: {
    type: String,
    default: "white",
  },
});

const iconFontSize = computed(() => {
  return props.sizePX * 0.6; // Adjust the multiplier as needed
});

defineEmits(["click"]);
</script>

<template>
  <!-- START Button Container -->
  <button
    type="button"
    class="waymark-button"
    :class="{ 'waymark-active': isActive }"
    :title="title"
    @click="$emit('click')"
    :style="{
      color: color,
      width: sizePX + 'px',
      height: sizePX + 'px',
    }"
  >
    <!-- START Icon -->
    <div class="waymark-icon-container">
      <span v-if="icon" class="waymark-icon">
        <i
          :class="`oi oi-${icon}`"
          :style="{ fontSize: iconFontSize + 'px' }"
        ></i>
      </span>
    </div>
    <!-- END Icon -->

    <!-- START Title -->
    <span class="waymark-title">{{ title }}</span>
    <!-- END Title -->
  </button>
  <!-- END Button Container -->
</template>

<style lang="scss" scoped>
.waymark-button {
  border: orange;
  text-align: center;
  text-shadow: 1px 1px 2px black;
  background: transparent;

  &.waymark-active {
    border-color: red;
    background: purple;
  }

  .waymark-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;

    .waymark-icon {
    }
  }

  .waymark-title {
    display: block;
    font-size: 12px;
  }
}
</style>
