import { Waymark } from './entry.js'

const waymark = new Waymark('map')

// Expose for browser tests and debugging
window.Waymark = Waymark
window.waymark = waymark
