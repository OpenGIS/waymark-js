export const waymarkEventName = "waymark-event";

export class WaymarkEvent extends CustomEvent {
  constructor(eventName, params = {}, eventData = {}) {
    // Add event data from store
    super(waymarkEventName, {
      detail: { eventName, ...params, ...eventData },
    });
  }
}
