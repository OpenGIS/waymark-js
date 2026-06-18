<script setup>
const route = useRoute();
const config = useRuntimeConfig();

const props = defineProps({
  mapPath: String,
});

const demoURL = computed(() => {
  // Use prop if available
  if (props.mapPath) {
    if (props.mapPath.startsWith("http://") || props.mapPath.startsWith("https://")) {
      return props.mapPath;
    }
    const cleanPath = props.mapPath.startsWith("/") ? props.mapPath.slice(1) : props.mapPath;
    return config.app.baseURL + cleanPath;
  }

  let url = config.app.baseURL;

  // Load the Waymark Map
  switch (route.path) {
    // Docs Home
    case "/":
      url += "examples/viewer/pub.html";

      break;

    // Map
    case "/map":
      url += "examples/viewer/basemap.html";

      break;

    // Viewer
    case "/viewer":
      url += "examples/viewer/route.html";

      break;

    // Editor
    case "/editor":
      url += "examples/editor/pub.html";

      break;

    // Customise
    case "/customise":
      url += "examples/editor/custom.html";

      break;

    // None
    default:
      url = "";
  }

  return url;
});
</script>

<template>
  <div class="demo">
    <a :href="demoURL" target="_blank">View Example &raquo;</a>

    <iframe
      v-if="demoURL"
      :src="demoURL"
      frameborder="0"
      scrolling="no"
      width="100%"
      height="400"
    />
  </div>
</template>

<style>
.demo {
  max-height: 400px;
  overflow: hidden;
  position: relative;
  margin-bottom: 20px;

  a {
    position: absolute;
    top: -1px;
    right: -1px;
    font-size: 14px;
    height: 22px;
    line-height: 22px;
    padding: 3px 10px;
    /*    padding: 5px 15px;*/
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    color: #333 !important;
    text-decoration: none;
    border-radius: 0 0 0 5px;
  }
}
</style>
