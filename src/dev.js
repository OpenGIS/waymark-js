import { createInstance } from './entry.js'

const waymarkInstance = createInstance('map')

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance
window.waymarkInstance = waymarkInstance
