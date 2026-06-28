<script setup>
import { ref, onMounted } from "vue";
import WaymarkDevPanel from "./components/WaymarkDevPanel.vue";

const instanceDocuments = ref([]);

onMounted(async () => {
  const responses = await Promise.all([
    fetch("/documents/instances/waymarkDemo1.json"),
    fetch("/documents/instances/waymarkDemo2.json"),
  ]);

  instanceDocuments.value = await Promise.all(responses.map((r) => r.json()));
});
</script>

<template>
  <div class="dev-app">
    <WaymarkDevPanel
      v-for="doc in instanceDocuments"
      :key="doc.config.id"
      :instance-document="doc"
    />
  </div>
</template>

<style lang="scss" scoped>
.dev-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
