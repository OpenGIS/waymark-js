import { storeToRefs } from "pinia";

const waymarkEventName = "waymark-event";

export class WaymarkEvent extends CustomEvent {
  constructor(eventName, params = {}, state) {
    // Get state
    const { eventData } = state;

    // Add event data from store
    super(waymarkEventName, {
      detail: { eventName, ...params, ...eventData.value },
    });
  }
}

export function dispatchEvent(eventName, params = {}, state) {
  // Get state
  const { container } = state;

  // Create event
  const event = new WaymarkEvent(eventName, params, state);

  // Fire
  if (container.value) {
    container.value.dispatchEvent(event);
  }
}

export function onEvent(eventName, callback, state) {
  // Get state
  const { container } = state;

  if (container.value) {
    container.value.addEventListener(waymarkEventName, (event) => {
      if (event.detail && event.detail.eventName === eventName) {
        callback(event);
      }
    });
  }
}
