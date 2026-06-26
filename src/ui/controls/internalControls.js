export const CONTROL_POSITIONS = [
  "top",
  "topRight",
  "right",
  "bottomRight",
  "bottom",
  "bottomLeft",
  "left",
  "topLeft",
];

export const PANEL_IDS = {
  debugOutput: "debug-output",
  basemaps: "basemaps",
};

/**
 * @returns {Record<string, Array<object>>}
 */
export function createEmptyControlsByPosition() {
  return CONTROL_POSITIONS.reduce((controlsByPosition, position) => {
    controlsByPosition[position] = [];
    return controlsByPosition;
  }, {});
}

/**
 * @param {{
 *   mode: 'view' | 'debug',
 *   activePanel: string | null,
 *   toggleDebugOutputPanel: () => void,
 *   toggleBasemapsPanel: () => void,
 * }} options
 */
export function resolveInternalControls(options) {
  const controlsByPosition = createEmptyControlsByPosition();

  controlsByPosition.bottomLeft.push({
    id: "basemaps-toggle",
    title:
      options.activePanel === PANEL_IDS.basemaps
        ? "Hide basemaps"
        : "Show basemaps",
    icon: "🗺",
    isActive: options.activePanel === PANEL_IDS.basemaps,
    onClick: options.toggleBasemapsPanel,
  });

  if (options.mode !== "debug") {
    return controlsByPosition;
  }

  controlsByPosition.topRight.push({
    id: "debug-output-toggle",
    title:
      options.activePanel === PANEL_IDS.debugOutput
        ? "Hide debug output"
        : "Show debug output",
    icon: "🐞",
    isActive: options.activePanel === PANEL_IDS.debugOutput,
    onClick: options.toggleDebugOutputPanel,
  });

  return controlsByPosition;
}
