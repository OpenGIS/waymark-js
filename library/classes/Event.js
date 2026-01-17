import { storeToRefs } from "pinia";
import { useInstanceStore } from "@/stores/instanceStore.js";

export class WaymarkEvent extends CustomEvent {
  constructor(eventName, params = {}) {
    const store = useInstanceStore();
    const { eventData } = storeToRefs(store);

    super(eventName, { detail: { ...params, ...eventData.value } });
  }
}

export function dispatchEvent(eventName, params = {}) {
  const store = useInstanceStore();
  const { container } = storeToRefs(store);
  const event = new WaymarkEvent(eventName, params);

  container.value.dispatchEvent(event);
}
