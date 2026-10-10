<script setup>
import { computed } from "vue";

const props = defineProps({
  size: { type: Number, default: 40 },
  href: { type: String, default: "https://ogis.org/" },
});

const linkStyle = computed(
  () => `
    display: inline-block;
    margin: 0;
    font-family:
      ui-monospace, "SFMono-Regular", "SF Mono", Menlo,
      Consolas, "Liberation Mono", monospace;
    font-size: ${props.size}px;
    line-height: 1;
    color: inherit;
    text-decoration: none;
    -webkit-user-select: none;
    user-select: none;
  `,
);

const tableStyle = `
  border-collapse: collapse;
  margin: 0;
  border-spacing: 0;
  font-size: 1em;
  color: currentColor;
  text-align: center;
`;

const cellBase = `
  box-sizing: content-box;
  width: 1.15em;
  height: 1.15em;
  padding: 0;
  text-align: center;
  vertical-align: middle;
  font: inherit;
  line-height: 1.15em;
  color: inherit;
  border: 0;
`;

const globeCell = `${cellBase}\n  border-bottom: 1px solid currentColor;\n  border-right: 1px solid currentColor;`;
const gCell = `${cellBase}\n  border-bottom: 1px solid currentColor;`;
const iCell = `${cellBase}\n  border-right: 1px solid currentColor;`;
const sCell = cellBase;

const svgStyle =
  "display: block; width: 0.75em; height: 0.75em; margin: 0 auto";
</script>

<template>
  <a :href="href" title="Open GIS" aria-label="Open GIS" :style="linkStyle">
    <table :style="tableStyle">
      <tbody>
        <tr>
          <td :style="globeCell">
            <svg
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
              :style="svgStyle"
            >
              <path
                fill="currentColor"
                d="M0 256a256 256 0 1 0 512 0a256 256 0 1 0 -512 0zM95 417 31 222 119 265 157 462ZM453 162 380 152 338 223 437 280 432 400 324 474 195 476 278 325 60 215 239 85 140 60 330 40 409 87 368 140 432 112Z"
              />
            </svg>
          </td>
          <td :style="gCell">G</td>
        </tr>
        <tr>
          <td :style="iCell">I</td>
          <td :style="sCell">S</td>
        </tr>
      </tbody>
    </table>
  </a>
</template>
