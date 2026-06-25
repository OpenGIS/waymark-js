import { resolveConfig } from "../config/resolveConfig.js";
import { createGeoJSONModule } from "../geojson/createGeoJSONModule.js";
import { ensureContainer } from "../map/ensureContainer.js";
import { createMap } from "../map/createMap.js";
import { createRasterBasemapModule } from "../map/createRasterBasemapModule.js";
import { createAppShell } from "../ui/createAppShell.js";
import {
  normaliseMode,
  serialiseInstanceDocument,
} from "../document/instanceDocument.js";
import { deleteCoreById, getCoreById, setCoreById } from "./runtimeRegistry.js";
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
 * @typedef {import('../config/resolveConfig.js').WaymarkResolvedConfig} WaymarkResolvedConfig
 */

/**
 * @typedef {import('../document/instanceDocument.js').WaymarkInstanceDocument} WaymarkInstanceDocument
 */

/**
 * @typedef {object} WaymarkMapState
 * @property {[number, number]} center
 * @property {number} zoom
 * @property {number} bearing
 * @property {number} pitch
 */

/**
 * @typedef {object} WaymarkInstancePublicApi
 * @property {string} id
 * @property {() => WaymarkInstanceDocument} toJSON
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
 * @property {{ map: WaymarkMapState, ui: { mode: 'view' | 'debug' } }} state
 * @property {WaymarkInstancePublicApi} publicApi
 * @property {{ container: HTMLElement, emit: (type: string, detail: import('./createInstanceEvents.js').WaymarkInstanceLifecycleEventDetail | import('./createInstanceEvents.js').WaymarkInstanceMapEventDetail | import('./createInstanceEvents.js').WaymarkInstanceModuleEventDetail) => void, on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void, once: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void }} events
 * @property {{ toJSON: () => WaymarkInstanceDocument }} instanceDocument
 * @property {{ appShell: { app: import('vue').App, mountElement: HTMLElement, refresh: () => void, setMode: (mode: 'view' | 'debug') => void, destroy: () => void } | null, geoJSON: { map: WaymarkMap, sourceId: string, layerId: string, geoJSON: object | null, destroy: () => void }, rasterBasemaps: { destroy: () => void }, mapEvents: { destroy: () => void }, stateSync: { destroy: () => void } }} modules
 * @property {{ phase: 'ready' | 'destroyed', destroy: () => void }} lifecycle
 */

const MAP_END_EVENTS = ["load", "moveend", "zoomend", "rotateend", "pitchend"];

/**
 * @param {WaymarkMap} map
 * @returns {WaymarkMapState}
 */
function readMapCameraState(map) {
  const center = map.getCenter();

  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

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
 * @param {WaymarkInstanceCore} core
 * @param {'view' | 'debug'} mode
 * @param {string} [source='core:lifecycle']
 */
function setCoreMode(core, mode, source = "core:lifecycle") {
  if (core.lifecycle.phase === "destroyed") {
    return;
  }

  const nextMode = normaliseMode(mode);
  const previousMode = core.state.ui.mode;

  if (previousMode === nextMode) {
    return;
  }

  core.state.ui.mode = nextMode;

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
    core.state.map = readMapCameraState(map);
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
 * @param {import('../document/instanceDocument.js').WaymarkInstanceDocumentStateMap} stateMap
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
 * @param {{ vector: object[], raster: object[] }} basemaps
 */
function serialiseAuthoredBasemaps(basemaps) {
  const serialised = {};

  if (basemaps.vector.length > 0) {
    serialised.vector = basemaps.vector;
  }

  if (basemaps.raster.length > 0) {
    serialised.raster = basemaps.raster;
  }

  return serialised;
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
  core.modules.rasterBasemaps.destroy();
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
  const authoredBasemaps = instanceDocument.config.map.basemaps;
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
    getInstanceDocument: () => core?.instanceDocument?.toJSON() ?? null,
    mode: resolvedConfig.ui.mode,
  });
  const geoJSONModule = createGeoJSONModule(
    map,
    containerId,
    instanceDocument.data.geoJSON,
  );

  core = {
    id: containerId,
    map,
    config: resolvedConfig,
    state: {
      map: readMapCameraState(map),
      ui: {
        mode: resolvedConfig.ui.mode,
      },
    },
    publicApi: null,
    events,
    instanceDocument: null,
    modules: {
      appShell,
      geoJSON: geoJSONModule,
      rasterBasemaps: createRasterBasemapModule(
        map,
        containerId,
        resolvedConfig.map.basemaps.raster,
      ),
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

  core.instanceDocument = {
    toJSON: () =>
      serialiseInstanceDocument({
        config: {
          id: core.id,
          map: {
            options: {
              ...core.config.map.options,
              ...toMapCameraOverrides(core.state.map),
            },
            ...(() => {
              const serialisedBasemaps =
                serialiseAuthoredBasemaps(authoredBasemaps);

              return Object.keys(serialisedBasemaps).length > 0
                ? { basemaps: serialisedBasemaps }
                : {};
            })(),
          },
          ui: {
            mode: core.state.ui.mode,
          },
        },
        state: {
          map: core.state.map,
          ui: {
            mode: core.state.ui.mode,
          },
        },
        data: {
          geoJSON: core.modules.geoJSON.geoJSON,
        },
      }),
  };

  if (core.modules.appShell) {
    core.modules.appShell.refresh();
  }

  core.publicApi = {
    id: containerId,
    toJSON: () => core.instanceDocument.toJSON(),
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
