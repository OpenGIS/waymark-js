import { resolveConfig } from "../config/resolveConfig.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import { ensureContainer } from "../map/ensureContainer.js";
import { createMap } from "../map/createMap.js";
import {
  createInstanceJSON,
  getMapCameraState,
} from "../state/createInstanceJSON.js";
import { deleteCoreById, getCoreById, setCoreById } from "./runtimeRegistry.js";
import { createAppShell } from "../ui/createAppShell.js";
import {
  createInstanceEvents,
  forwardMapEventsToInstanceContainer,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
} from "./createInstanceEvents.js";

/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkConfig} WaymarkConfig
 */

/**
 * @typedef {import('../instance/normaliseInstanceDocument.js').WaymarkInstanceDocument} WaymarkInstanceDocument
 */

/**
 * @typedef {import('../config/resolveConfig.js').WaymarkResolvedConfig} WaymarkResolvedConfig
 */

/**
 * @typedef {object} WaymarkInstancePublicApi
 * @property {string} id
 * @property {() => import('../state/createInstanceJSON.js').WaymarkInstanceDocument} toJSON
 * @property {{ setMode: (mode: 'view' | 'debug') => void }} ui
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
 * @property {{ map: import('../state/createInstanceJSON.js').WaymarkMapState, ui: { mode: 'view' | 'debug' } }} state
 * @property {WaymarkInstancePublicApi} publicApi
 * @property {{ container: HTMLElement, emit: (type: string, detail: import('./createInstanceEvents.js').WaymarkInstanceLifecycleEventDetail | import('./createInstanceEvents.js').WaymarkInstanceMapEventDetail | import('./createInstanceEvents.js').WaymarkInstanceModuleEventDetail) => void, on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void, once: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void }} events
 * @property {{ toJSON: () => import('../state/createInstanceJSON.js').WaymarkInstanceDocument }} instanceJSON
 * @property {{ mode: 'view' | 'debug' }} ui
 * @property {{ appShell: { app: import('vue').App, mountElement: HTMLElement, refresh: () => void, setMode: (mode: 'view' | 'debug') => void, destroy: () => void } | null, geoJSON: { map: WaymarkMap, sourceId: string, layerId: string, geoJSON: object | null, destroy: () => void }, mapEvents: { destroy: () => void }, stateSync: { destroy: () => void } }} modules
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void, setMode: (mode: 'view' | 'debug', source?: string) => void }} lifecycle
 */

const MAP_END_EVENTS = ["load", "moveend", "zoomend", "rotateend", "pitchend"];

/**
 * @param {string} id
 */
function createLifecycleDetail(id) {
  return { id };
}

/**
 * @param {string} id
 * @param {string} module
 * @param {string} event
 * @param {unknown} previous
 * @param {unknown} next
 * @param {string} source
 */
function createModuleEventDetail(id, module, event, previous, next, source) {
  return {
    id,
    module,
    event,
    previous,
    next,
    source,
  };
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
 * @param {string} [source='core:lifecycle']
 */
function setCoreMode(core, mode, source = "core:lifecycle") {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  const nextMode = normaliseMode(mode);
  const previousMode = core.ui.mode;

  if (previousMode === nextMode) {
    return;
  }

  core.ui.mode = nextMode;
  core.state.ui.mode = nextMode;
  core.config.ui.mode = nextMode;

  core.events.emit(
    WAYMARK_UI_MODE_CHANGED_EVENT,
    createModuleEventDetail(
      core.id,
      "ui",
      "mode.changed",
      previousMode,
      nextMode,
      source,
    ),
  );

  if (core.modules.appShell) {
    core.modules.appShell.setMode(nextMode);
  }
}

/**
 * @param {{
 *   core: WaymarkInstanceCore,
 *   map: WaymarkMap,
 * }} options
 */
function createStateSyncModule(options) {
  const { core, map } = options;
  const listeners = [];

  const syncMapState = () => {
    core.state.map = getMapCameraState(map);
  };

  for (const mapEvent of MAP_END_EVENTS) {
    const handler = () => {
      syncMapState();
    };
    map.on(mapEvent, handler);
    listeners.push([mapEvent, handler]);
  }

  syncMapState();

  return {
    destroy() {
      for (const [mapEvent, handler] of listeners) {
        map.off(mapEvent, handler);
      }
    },
  };
}

/**
 * @param {import('../instance/normaliseInstanceDocument.js').WaymarkInstanceDocumentStateMap} stateMap
 */
function toMapCameraOverrides(stateMap) {
  const overrides = {};

  for (const key of ["center", "zoom", "bearing", "pitch"]) {
    if (Object.hasOwn(stateMap, key)) {
      overrides[key] = stateMap[key];
    }
  }

  return overrides;
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
  core.modules.stateSync.destroy();

  if (core.modules.appShell) {
    core.modules.appShell.destroy();
    core.modules.appShell.app.unmount();
    core.modules.appShell.mountElement.remove();
  }

  core.map.remove();
  deleteCoreById(core.id);
}

/**
 * @param {WaymarkInstanceDocument} instanceDocument
 * @returns {{ publicApi: WaymarkInstancePublicApi, core: WaymarkInstanceCore }}
 */
export function createInstanceCore(instanceDocument) {
  const containerId = ensureContainer(instanceDocument.config.id);
  const existingCore = getCoreById(containerId);

  if (existingCore) {
    existingCore.events.emit(WAYMARK_INSTANCE_RECREATED_EVENT, {
      id: existingCore.id,
    });
    existingCore.lifecycle.destroy();
  }

  const { id: _containerIdFromConfig, ...configOverrides } =
    instanceDocument.config;
  const resolvedConfig = resolveConfig(configOverrides);
  resolvedConfig.map.options = {
    ...resolvedConfig.map.options,
    ...toMapCameraOverrides(instanceDocument.state.map),
  };
  resolvedConfig.ui.mode = normaliseMode(instanceDocument.state.ui.mode);

  const events = createInstanceEvents(containerId);
  const map = createMap(containerId, resolvedConfig);
  /** @type {WaymarkInstanceCore | null} */
  let core = null;
  const appShell = createAppShell(containerId, {
    events,
    getInstanceJSON: () => core?.instanceJSON?.toJSON() ?? null,
    mode: resolvedConfig.ui.mode,
  });
  const geoJSONModule = createGeoJSONModule(
    map,
    containerId,
    instanceDocument.data.geojson,
  );

  core = {
    id: containerId,
    map,
    config: resolvedConfig,
    state: {
      map: getMapCameraState(map),
      ui: {
        mode: resolvedConfig.ui.mode,
      },
    },
    publicApi: null,
    events,
    instanceJSON: null,
    ui: {
      mode: resolvedConfig.ui.mode,
    },
    modules: {
      appShell,
      geoJSON: geoJSONModule,
      mapEvents: {
        destroy() {},
      },
      stateSync: {
        destroy() {},
      },
    },
    lifecycle: {
      phase: "ready",
      destroy: () => destroyCore(core),
      setMode: (mode, source) => setCoreMode(core, mode, source),
    },
  };

  core.modules.stateSync = createStateSyncModule({
    core,
    map: core.map,
  });
  core.modules.mapEvents = forwardMapEventsToInstanceContainer({
    id: containerId,
    map: core.map,
    events: core.events,
  });

  core.instanceJSON = createInstanceJSON({
    getMapState: () => core.state.map,
    getMode: () => core.ui.mode,
    getConfig: () => ({
      id: core.id,
      map: {
        options: core.config.map.options,
      },
      ui: {
        mode: core.ui.mode,
      },
    }),
    modules: core.modules,
  });

  if (core.modules.appShell) {
    core.modules.appShell.refresh();
  }

  core.publicApi = {
    id: containerId,
    toJSON: () => core.instanceJSON.toJSON(),
    ui: {
      setMode: (mode) => setCoreMode(core, mode, "public:ui.setMode"),
    },
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
