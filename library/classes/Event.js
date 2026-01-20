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
