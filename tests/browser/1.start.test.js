import { test, expect } from '@playwright/test'

test.describe('1. Start Here', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // ------------------------------------------------------------------ //
  // Quick Start
  // ------------------------------------------------------------------ //

  test.describe('Quick Start', () => {
    test('renders the map container', async ({ page }) => {
      await expect(page.locator('#map')).toBeVisible()
    })

    test('MapLibre creates a canvas inside the container', async ({ page }) => {
      // MapLibre GL renders its map into a <canvas> synchronously on construction
      await expect(page.locator('#map canvas')).toBeVisible({ timeout: 5000 })
    })
  })

  // ------------------------------------------------------------------ //
  // Accessing the MapLibre instance
  // ------------------------------------------------------------------ //

  test.describe('Accessing the MapLibre instance', () => {
    test('map instance is attached to window.waymark', async ({ page }) => {
      const hasMap = await page.evaluate(
        () => window.waymark?.map != null,
      )
      expect(hasMap).toBe(true)
    })
  })
})
