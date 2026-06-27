<script setup>
import WaymarkDevPanel from "./components/WaymarkDevPanel.vue";

const mapOneConfig = {
  id: "map",
  ui: {
    mode: "view",
  },
  map: {
    basemaps: {
      raster: [
        {
          title: "OpenCycleMap",
          tileURLTemplates: [
            "https://api.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=4550655437ba47fda736e7898339c95f",
          ],
          attributionHTML:
            "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
          opacity: 0.7,
        },
        {
          title: "OpenTopoMap raster overlay",
          tileURLTemplates: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          attributionHTML:
            "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
          opacity: 0.5,
        },
        {
          title: "ESRI Satellite",
          tileURLTemplates: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          attributionHTML: "Imagery: <a href='https://www.esri.com'>© Esri</a>",
          opacity: 0.5,
        },
      ],
      vector: [
        {
          title: "OpenFreeMap Bright",
          styleURL: "https://tiles.openfreemap.org/styles/bright",
          attributionHTML:
            "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
        },
        {
          title: "OpenFreeMap Liberty",
          styleURL: "https://tiles.openfreemap.org/styles/liberty",
          attributionHTML:
            "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
        },
      ],
    },
    options: {
      center: [-128.0094, 50.6539],
      zoom: 15,
    },
  },
};

const mapTwoConfig = {
  id: "map-two",
  ui: {
    mode: "debug",
  },
  map: {
    basemaps: {
      raster: [
        {
          title: "OpenStreetMap raster",
          tileURLTemplates: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          attributionHTML:
            "<a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>",
          opacity: 1,
        },
        {
          title: "OpenTopoMap raster overlay",
          tileURLTemplates: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
          attributionHTML:
            "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
          opacity: 0.4,
        },
      ],
    },
    options: {
      center: [-0.1276, 51.5074],
      zoom: 11,
    },
  },
};
</script>

<template>
  <div class="dev-app">
    <WaymarkDevPanel
      map-id="map"
      :config="mapOneConfig"
      select-id="dev-instance-mode"
      label-text="#map ui.mode"
      window-global-key="waymarkInstance"
    />
    <WaymarkDevPanel
      map-id="map-two"
      :config="mapTwoConfig"
      select-id="dev-instance-mode-two"
      label-text="#map-two ui.mode"
      window-global-key="waymarkInstanceTwo"
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
