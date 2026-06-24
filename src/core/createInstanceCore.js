import { resolveConfig } from "../config/resolveConfig.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import { ensureContainer } from "../map/ensureContainer.js";
import { createMap } from "../map/createMap.js";
import { createInstanceSnapshot } from "../state/createInstanceSnapshot.js";
import { deleteCoreById, getCoreById, setCoreById } from "./runtimeRegistry.js";
import { createAppShell } from "../ui/createAppShell.js";
import {
  createInstanceEvents,
  forwardMapEventsToInstanceContainer,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_REUSED_EVENT,
} from "./createInstanceEvents.js";

/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkConfig} WaymarkConfig
 */

/**
 * @typedef {WaymarkConfig & { id?: string }} WaymarkCreateInstanceConfig
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
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} on
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void} off
 * @property {(type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void} once
 */

/**
 * @typedef {object} WaymarkInstanceCore
 * @property {string} id
 * @property {WaymarkMap} map
 * @property {WaymarkResolvedConfig} config
 * @property {WaymarkInstancePublicApi} publicApi
 * @property {{ container: HTMLElement, emit: (type: string, detail: import('./createInstanceEvents.js').WaymarkInstanceLifecycleEventDetail | import('./createInstanceEvents.js').WaymarkInstanceMapEventDetail) => void, on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void, once: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void }} events
 * @property {{ getSnapshot: () => import('../state/createInstanceSnapshot.js').WaymarkInstanceSnapshot }} snapshot
 * @property {{ mode: 'view' | 'debug' }} ui
 * @property {{ appShell: { app: import('vue').App, mountElement: HTMLElement, refresh: () => void, setMode: (mode: 'view' | 'debug') => void, destroy: () => void } | null, geoJSON: { map: WaymarkMap, sourceId: string, layerId: string, geoJSON: object | null, destroy: () => void }, mapEvents: { destroy: () => void } }} modules
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void, setMode: (mode: 'view' | 'debug') => void }} lifecycle
 */

/**
 * @param {string} id
 */
function createLifecycleDetail(id) {
  return { id };
}

/**
 * @param {unknown} mode
 * @returns {'view' | 'debug'}
 */
function normaliseMode(mode) {
  return mode === "debug" ? "debug" : "view";
}

/**
 * @param {WaymarkInstanceCore} core
 * @param {'view' | 'debug'} mode
 */
function setCoreMode(core, mode) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  const nextMode = normaliseMode(mode);

  if (core.ui.mode === nextMode) {
    return;
  }

  core.ui.mode = nextMode;
  core.config.ui.mode = nextMode;

  if (core.modules.appShell) {
    core.modules.appShell.setMode(nextMode);
  }
}

/**
 * @param {WaymarkInstanceCore} core
 */
function destroyCore(core) {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  core.lifecycle.phase = "destroyed";
  core.events.emit(
    WAYMARK_INSTANCE_DESTROYED_EVENT,
    createLifecycleDetail(core.id),
  );

  core.modules.geoJSON.destroy();
  core.modules.mapEvents.destroy();

  if (core.modules.appShell) {
    core.modules.appShell.destroy();
    core.modules.appShell.app.unmount();
    core.modules.appShell.mountElement.remove();
  }

  core.map.remove();
  deleteCoreById(core.id);
}

/**
 * @param {WaymarkCreateInstanceConfig} [config]
 * @param {object} [geoJSON]
 * @returns {{ publicApi: WaymarkInstancePublicApi, core: WaymarkInstanceCore }}
 */
export function createInstanceCore(config, geoJSON) {
  const containerId = ensureContainer(config?.id);
  const existingCore = getCoreById(containerId);

  if (existingCore) {
    existingCore.events.emit(
      WAYMARK_INSTANCE_REUSED_EVENT,
      createLifecycleDetail(existingCore.id),
    );

    return {
      publicApi: existingCore.publicApi,
      core: existingCore,
    };
  }

  const { id: _containerIdFromConfig, ...configOverrides } = config ?? {};
  const resolvedConfig = resolveConfig(configOverrides);
  const events = createInstanceEvents(containerId);
  const map = createMap(containerId, resolvedConfig);
  /** @type {WaymarkInstanceCore | null} */
  let core = null;
  const appShell = createAppShell(containerId, {
    events,
    getSnapshot: () => core?.snapshot?.getSnapshot() ?? null,
    mode: resolvedConfig.ui.mode,
  });
  const geoJSONModule = createGeoJSONModule(map, containerId, geoJSON);
  const mapEventsModule = forwardMapEventsToInstanceContainer({
    id: containerId,
    map,
    events,
  });

  core = {
    id: containerId,
    map,
    config: resolvedConfig,
    publicApi: null,
    events,
    snapshot: null,
    ui: {
      mode: resolvedConfig.ui.mode,
    },
    modules: {
      appShell,
      geoJSON: geoJSONModule,
      mapEvents: mapEventsModule,
    },
    lifecycle: {
      phase: "ready",
      destroy: () => destroyCore(core),
      setMode: (mode) => setCoreMode(core, mode),
    },
  };

  core.snapshot = createInstanceSnapshot({
    map: core.map,
    getMode: () => core.ui.mode,
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
    on: (type, handler, options) => {
      core.events.on(type, handler, options);
    },
    off: (type, handler, options) => {
      core.events.off(type, handler, options);
    },
    once: (type, handler, options) => {
      core.events.once(type, handler, options);
    },
  };

  setCoreById(containerId, core);
  core.events.emit(
    WAYMARK_INSTANCE_CREATED_EVENT,
    createLifecycleDetail(core.id),
  );

  return {
    publicApi: core.publicApi,
    core,
  };
}
