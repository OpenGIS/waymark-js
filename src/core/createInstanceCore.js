import { resolveConfig } from "../config/resolveConfig.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import { ensureContainer } from "../map/ensureContainer.js";
import { createMap } from "../map/createMap.js";
import { createInstanceSnapshot } from "../state/createInstanceSnapshot.js";
import { deleteCoreById, getCoreById, setCoreById } from "./runtimeRegistry.js";
import { createAppShell } from "../ui/createAppShell.js";

/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkConfig} WaymarkConfig
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkResolvedConfig} WaymarkResolvedConfig
 */

/**
 * @typedef {object} WaymarkInstancePublicApi
 * @property {string} id
 * @property {WaymarkMap} map
 * @property {WaymarkResolvedConfig} config
 * @property {() => import('../state/createInstanceSnapshot.js').WaymarkInstanceSnapshot} getSnapshot
 * @property {() => void} destroy
 */

/**
 * @typedef {object} WaymarkInstanceCore
 * @property {string} id
 * @property {WaymarkMap} map
 * @property {WaymarkResolvedConfig} config
 * @property {WaymarkInstancePublicApi} publicApi
 * @property {{ getSnapshot: () => import('../state/createInstanceSnapshot.js').WaymarkInstanceSnapshot }} snapshot
 * @property {{ appShell: { app: import('vue').App, mountElement: HTMLElement, refresh: () => void, destroy: () => void } | null, geoJSON: { map: WaymarkMap, sourceId: string, layerId: string, geoJSON: object | null, destroy: () => void } }} modules
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void }} lifecycle
 */

/**
 * @param {WaymarkInstanceCore} core
 */
function destroyCore(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  core.lifecycle.phase = "destroyed";

  core.modules.geoJSON.destroy();

  if (core.modules.appShell) {
    core.modules.appShell.destroy();
    core.modules.appShell.app.unmount();
    core.modules.appShell.mountElement.remove();
  }

  core.map.remove();
  deleteCoreById(core.id);
}

/**
 * @param {string} [id]
 * @param {WaymarkConfig} [config]
 * @param {object} [geoJSON]
 * @returns {{ publicApi: WaymarkInstancePublicApi, core: WaymarkInstanceCore }}
 */
export function createInstanceCore(id, config, geoJSON) {
  const containerId = ensureContainer(id);
  const existingCore = getCoreById(containerId);

  if (existingCore) {
    return {
      publicApi: existingCore.publicApi,
      core: existingCore,
    };
  }

  const resolvedConfig = resolveConfig(config);
  const map = createMap(containerId, resolvedConfig);
  /** @type {WaymarkInstanceCore | null} */
  let core = null;
  const appShell = createAppShell(containerId, {
    map,
    getSnapshot: () => core?.snapshot?.getSnapshot() ?? null,
  });
  const geoJSONModule = createGeoJSONModule(map, containerId, geoJSON);

  core = {
    id: containerId,
    map,
    config: resolvedConfig,
    publicApi: null,
    snapshot: null,
    modules: {
      appShell,
      geoJSON: geoJSONModule,
    },
    lifecycle: {
      phase: "ready",
      destroy: () => destroyCore(core),
    },
  };

  core.snapshot = createInstanceSnapshot({
    map: core.map,
    modules: core.modules,
  });

  if (core.modules.appShell) {
    core.modules.appShell.refresh();
  }

  core.publicApi = {
    id: containerId,
    map,
    config: resolvedConfig,
    getSnapshot: () => core.snapshot.getSnapshot(),
    destroy: () => core.lifecycle.destroy(),
  };

  setCoreById(containerId, core);

  return {
    publicApi: core.publicApi,
    core,
  };
}
