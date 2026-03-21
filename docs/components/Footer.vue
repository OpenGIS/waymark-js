<script setup>
import { version } from "../../package.json";
</script>

<template>
  <footer>
    <div class="left">
      <!-- WordPress -->
      <a href="https://www.ogis.org/waymark-wp/"
        >&laquo;
        <Icon
          width="20"
          height="20"
          color="#b42714"
          title="Waymark WordPress Plugin" />
        + <Icon name="wordpress" width="18" height="18" color="#333"
      /></a>
    </div>

    <div class="middle">
      <!-- Version -->
      v{{ version }}

      <!-- GitHub -->
      <a href="https://github.com/opengis/waymark-js">
        <Icon name="github" color="#555" width="30" height="30" />
      </a>

      <!-- Joe -->
      <a href="https://www.morehawes.ca/">by Joe</a>
    </div>

    <div class="right">
      <Nav />
    </div>
  </footer>
</template>
