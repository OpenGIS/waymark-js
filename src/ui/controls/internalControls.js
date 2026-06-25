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
 *   isDebugOutputVisible: boolean,
 *   toggleDebugOutput: () => void,
 * }} options
 */
export function resolveInternalControls(options) {
  const controlsByPosition = createEmptyControlsByPosition();

  if (options.mode !== "debug") {
    return controlsByPosition;
  }

  controlsByPosition.topRight.push({
    id: "debug-output-toggle",
    title: options.isDebugOutputVisible
      ? "Hide debug output"
      : "Show debug output",
    icon: "🐞",
    isActive: options.isDebugOutputVisible,
    onClick: options.toggleDebugOutput,
  });

  return controlsByPosition;
}
