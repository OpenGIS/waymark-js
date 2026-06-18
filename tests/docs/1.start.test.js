import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock maplibre-gl — WebGL is unavailable in JSDOM
vi.mock('maplibre-gl', () => {
  const MockMap = vi.fn(function (options) {
    this._options = options
    this.on = vi.fn()
    this.remove = vi.fn()
  })
  return { Map: MockMap }
})

// Suppress CSS import from Waymark.js
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

import { Waymark } from '../../src/Waymark.js'
import { Map } from 'maplibre-gl'

describe('1. Start Here', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map" style="width: 500px; height: 400px;"></div>'
    vi.clearAllMocks()
  })

  // ------------------------------------------------------------------ //
  // Quick Start
  // ------------------------------------------------------------------ //

  describe('Quick Start', () => {
    it('creates a Waymark instance', () => {
      const waymark = new Waymark('map')
      expect(waymark).toBeInstanceOf(Waymark)
    })

    it('mounts into the specified container ID', () => {
      new Waymark('map')
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ container: 'map' }),
      )
    })
  })

  // ------------------------------------------------------------------ //
  // Constructor — defaults
  // ------------------------------------------------------------------ //

  describe('Constructor defaults', () => {
    it('defaults to the demotiles style', () => {
      new Waymark('map')
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'https://demotiles.maplibre.org/style.json',
        }),
      )
    })

    it('defaults to center [0, 0]', () => {
      new Waymark('map')
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [0, 0] }),
      )
    })

    it('defaults to zoom 2', () => {
      new Waymark('map')
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 2 }),
      )
    })
  })

  // ------------------------------------------------------------------ //
  // Options
  // ------------------------------------------------------------------ //

  describe('Options', () => {
    it('accepts a custom style URL', () => {
      new Waymark('map', { style: 'https://custom.tiles.json' })
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ style: 'https://custom.tiles.json' }),
      )
    })

    it('accepts a custom center', () => {
      new Waymark('map', { center: [-0.1276, 51.5074] })
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [-0.1276, 51.5074] }),
      )
    })

    it('accepts a custom zoom', () => {
      new Waymark('map', { zoom: 10 })
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 10 }),
      )
    })
  })

  // ------------------------------------------------------------------ //
  // Accessing the MapLibre instance
  // ------------------------------------------------------------------ //

  describe('Accessing the MapLibre instance', () => {
    it('exposes the MapLibre map via the .map getter', () => {
      const waymark = new Waymark('map')
      expect(waymark.map).toBeDefined()
    })

    it('.map is the instance returned by the Map constructor', () => {
      const waymark = new Waymark('map')
      expect(Map).toHaveBeenCalledOnce()
      expect(waymark.map).toHaveProperty('_options')
      expect(waymark.map._options).toMatchObject({ container: 'map' })
    })
  })
})
