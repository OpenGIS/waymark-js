import {
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_DEBUG_CHANGED_EVENT,
  WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT,
} from "../createInstanceEvents.js";

/**
 * @typedef {import('../createInstanceEvents.js').WaymarkStateChangedEventDetail} WaymarkStateChangedEventDetail
 */

/**
 * @typedef {{
 *   debug: boolean,
 *   types: Record<string, { visible: boolean }>,
 * }} WaymarkInstanceRuntimeState
 */

const DEFAULT_STATE = {
  debug: false,
  types: {},
};

/**
 * @param {unknown} value
 */
function cloneValue(value) {
  return structuredClone(value);
}

/**
 * @param {WaymarkInstanceRuntimeState} state
 */
function createStateSnapshot(state) {
  return cloneValue(state);
}

/**
 * @param {WaymarkInstanceRuntimeState} state
 * @param {string} command
 * @param {unknown} payload
 */
function resolveMutation(state, command, payload) {
  switch (command) {
    case "types.visibility.set": {
      const typeKey =
        typeof payload?.typeKey === "string" ? payload.typeKey : null;
      const visible = payload?.visible === true;

      if (!typeKey) {
        return null;
      }

      const previous = state.types[typeKey]?.visible ?? true;

      if (previous === visible) {
        return null;
      }

      if (visible) {
        // Only serialise non-default (hidden) state
        delete state.types[typeKey];
      } else {
        state.types[typeKey] = { visible: false };
      }

      return {
        scope: "types.visibility",
        eventType: WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT,
        previous,
        next: visible,
        meta: { typeKey },
      };
    }
    case "types.visibility.reset": {
      const previous = { ...state.types };

      if (Object.keys(previous).length === 0) {
        return null;
      }

      state.types = {};

      return {
        scope: "types.visibility",
        eventType: WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT,
        previous,
        next: true,
      };
    }
    case "debug.set": {
      const previous = state.debug;
      const next = payload?.enabled === true;

      if (previous === next) {
        return null;
      }

      state.debug = next;

      return {
        scope: "debug",
        eventType: WAYMARK_STATE_DEBUG_CHANGED_EVENT,
        previous,
        next,
      };
    }
    default:
      return null;
  }
}

/**
 * @param {{
 *   id: string,
 *   events: { emit: (type: string, detail: WaymarkStateChangedEventDetail) => void },
 *   initialState?: Partial<WaymarkInstanceRuntimeState>,
 * }} options
 */
export function createInstanceState(options) {
  const { id, events } = options;
  const state = {
    ...cloneValue(DEFAULT_STATE),
    ...(options.initialState ? cloneValue(options.initialState) : {}),
  };
  const listeners = new Set();

  return {
    getSnapshot() {
      return createStateSnapshot(state);
    },
    /**
     * @param {string} command
     * @param {unknown} [payload]
     * @param {string} [source='runtime:unknown']
     */
    dispatch(command, payload = {}, source = "runtime:unknown") {
      const mutation = resolveMutation(state, command, payload);

      if (!mutation) {
        return false;
      }

      const detail = {
        id,
        command,
        scope: mutation.scope,
        previous: mutation.previous,
        next: mutation.next,
        ...(mutation.meta ? { meta: mutation.meta } : {}),
        source,
        snapshot: createStateSnapshot(state),
      };

      events.emit(mutation.eventType, detail);
      events.emit(WAYMARK_STATE_CHANGED_EVENT, detail);

      for (const listener of listeners) {
        listener(detail);
      }

      return true;
    },
    /**
     * @param {(detail: WaymarkStateChangedEventDetail) => void} listener
     */
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
