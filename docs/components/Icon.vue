<script setup>
const config = useRuntimeConfig();

const props = defineProps({
  name: { default: "waymark", type: String },
  color: { default: "#fff", type: String },
  width: { default: "30", type: String },
  height: { default: "30", type: String },
});

const getStyle = () => {
  return `
    background-color: ${props.color};
    color: ${props.color};
    mask-image: url(${config.app.cdnURL || config.app.baseURL}assets/icon/${props.name}.svg);
    width: ${props.width}px;
    height: ${props.height}px;
    mask-size: ${props.width}px ${props.height}px;
  `;
};
</script>

<template>
  <div :class="`waymark-icon-wrap waymark-icon-${props.name}`">
    <div class="waymark-icon" :style="getStyle()" />

    <slot />
  </div>
</template>

<style lang="less">
.waymark-icon-wrap {
  display: inline-block;
  overflow: hidden;
  vertical-align: middle;

  .waymark-icon {
    display: inline-block;
    mask-repeat: no-repeat;
    min-width: 20px;
    min-height: 20px;
    mask-position: center;
    overflow: hidden;
  }
}
</style>
