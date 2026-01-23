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

export function createEventHooks(state) {
  const { container } = state;

  function dispatchEvent(eventName, params = {}) {
    // Create event
    const event = new WaymarkEvent(eventName, params, state);

    // Fire
    if (container.value) {
      container.value.dispatchEvent(event);
    }
  }

  function onEvent(eventName, callback) {
    if (container.value) {
      container.value.addEventListener(waymarkEventName, (event) => {
        if (event.detail && event.detail.eventName === eventName) {
          callback(event);
        }
      });
    }
  }

  return {
    dispatchEvent,
    onEvent,
  };
}
