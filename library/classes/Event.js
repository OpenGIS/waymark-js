import { storeToRefs } from "pinia";
import { useStateStore } from "@/stores/state.js";

export class WaymarkEvent extends CustomEvent {
  constructor(eventName, params = {}) {
    // Get state
    const stateStore = useStateStore();
    const { eventData } = storeToRefs(stateStore);

    // Add event data from store
    super(eventName, { detail: { ...params, ...eventData.value } });
  }
}

export function dispatchEvent(eventName, params = {}) {
  // Get state
  const stateStore = useStateStore();
  const { container } = storeToRefs(stateStore);

  // Create event
  const event = new WaymarkEvent(eventName, params);

  // Fire
  container.value.dispatchEvent(event);
}

/*
  // Listen for events
  instanceContainer.addEventListener("instance-ready", (event) => {
    if (event.detail && event.detail.map) {
      console.log("instance-ready event received with:", event.detail);

      setMap(event.detail.map);
    }
  });

*/

export function onEvent(eventName, callback) {
  // Get state
  const stateStore = useStateStore();
  const { container } = storeToRefs(stateStore);

  // Add event listener
  container.value.addEventListener(eventName, (event) => {
    callback(event);
  });
}
