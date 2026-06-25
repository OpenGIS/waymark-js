/**
 * @param {{
 *   getInstanceDocument: () => import('../document/instanceDocument.js').WaymarkInstanceDocument,
 *   getRuntimeMetadata: () => {
 *     lifecycle: { phase: 'ready' | 'destroyed' },
 *     geoJSON: { sourceId: string, layerId: string }
 *   }
 * }} options
 */
export function createInstanceDebugPayload(options) {
  return {
    toJSON() {
      return {
        instanceDocument: options.getInstanceDocument(),
        runtime: options.getRuntimeMetadata(),
      };
    },
  };
}
