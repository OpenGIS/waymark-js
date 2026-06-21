import { test, expect } from '@playwright/test'

test.describe('3. Config', () => {
  // ------------------------------------------------------------------ //
  // Basemaps — Vector
  // ------------------------------------------------------------------ //

  test.describe('Basemaps — Vector', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
    })

    test('vector basemap renders a canvas', async ({ page }) => {
      await expect(page.locator('#map canvas')).toBeVisible({ timeout: 5000 })
    })

    test('no JS errors on vector basemap load', async ({ page }) => {
      const errors = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      await expect(page.locator('#map canvas')).toBeVisible({ timeout: 5000 })
      expect(errors).toHaveLength(0)
    })
  })

  // ------------------------------------------------------------------ //
  // Basemaps — Raster
  // ------------------------------------------------------------------ //

  test.describe('Basemaps — Raster', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
    })

    test('raster basemap renders a canvas', async ({ page }) => {
      await page.evaluate(() => {
        const div = document.createElement('div')
        div.id = 'map-raster-test'
        div.style.width = '500px'
        div.style.height = '400px'
        document.body.appendChild(div)
        new window.Waymark('map-raster-test', {
          map: {
            basemaps: [
              {
                name: 'OpenStreetMap',
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
              },
            ],
          },
        })
        return true
      })
      await expect(page.locator('#map-raster-test canvas')).toBeVisible({ timeout: 5000 })
    })

    test('no JS errors on raster basemap load', async ({ page }) => {
      const errors = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      await page.evaluate(() => {
        const div = document.createElement('div')
        div.id = 'map-raster-test'
        div.style.width = '500px'
        div.style.height = '400px'
        document.body.appendChild(div)
        new window.Waymark('map-raster-test', {
          map: {
            basemaps: [
              {
                name: 'OpenStreetMap',
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
              },
            ],
          },
        })
        return true
      })
      await expect(page.locator('#map-raster-test canvas')).toBeVisible({ timeout: 5000 })
      expect(errors).toHaveLength(0)
    })
  })
})
