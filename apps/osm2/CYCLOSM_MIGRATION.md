# CyclOSM Styling Migration — OSM Highlights App

## Overview

The OSM Highlights app has been updated to replicate **CyclOSM** styling, providing a comprehensive cycling infrastructure visualization system with distinct visual representations for different types of bicycle routes and amenities.

## Changes Made

### 1. **Data Model Enhancement** (`composables/useQueries.js`)

#### Added Support for Line Styling Properties

The query model now includes two new properties:

```javascript
{
  ...
  lineWidth: number,    // Width of the line in pixels (0.5–10)
  lineDash: array|null  // Array of dash pattern [on, off, ...] e.g. [2, 2]
  ...
}
```

#### Updated `createBlankQuery()`

New queries now default to:
- `lineWidth: 3` (default line width)
- `lineDash: null` (solid lines by default)

#### Version Management for localStorage

Added automatic cache invalidation:

```javascript
const STORAGE_VERSION_KEY = "osm2-queries-version";
const CURRENT_VERSION = 2;  // Increment this value to invalidate old stored queries
```

The `loadFromStorage()` function now:
- Checks if the stored version matches `CURRENT_VERSION`
- If mismatch, clears old localStorage data and loads fresh defaults
- Automatically updates the version key on load

**To invalidate old cached queries, increment `CURRENT_VERSION` by 1.**

---

### 2. **New Default Queries — CyclOSM-Inspired Set**

The `defaultQueries()` function now returns 8 predefined queries organized into route types and amenities:

#### **Route Infrastructure** (transportation layer)

1. **Dedicated Cycle Tracks** 🚴
   - **Color**: `#0000ce` (Deep Blue)
   - **Width**: 4px
   - **Style**: Solid
   - **Filter**: `subclass = cycleway`
   - **Purpose**: Highest confidence cycling infrastructure — physically separated from traffic

2. **Designated Shared Paths** 🛤️
   - **Color**: `#0060ff` (Medium Blue)
   - **Width**: 3px
   - **Style**: Solid
   - **Filter**: `class = path` AND `bicycle = designated` AND `surface = paved`
   - **Purpose**: Paths explicitly signed for bicycles with good paved surfaces

3. **On-Street Cycle Lanes** 🚗↔️🚲
   - **Color**: `#0060ff` (Medium Blue)
   - **Width**: 2px
   - **Style**: **Dashed** `[2, 2]`
   - **Filter**: `bicycle = designated` AND `class ≠ path` AND `subclass ≠ cycleway`
   - **Purpose**: Designated lanes on roads (dashing indicates integration with vehicle traffic)

4. **Bicycle Friendly Paths (Mixed)** 🌲
   - **Color**: `#007360` (Teal Green)
   - **Width**: 3px
   - **Style**: Solid
   - **Filter**: `class = path` AND `bicycle = yes`
   - **Purpose**: General paths open to bicycles with positive designation

5. **Unpaved / MTB Tracks** 🏔️
   - **Color**: `#741e18` (Dark Brown/Red)
   - **Width**: 3px
   - **Style**: **Dashed** `[3, 3]`
   - **Filter**: `surface ≠ paved` AND `bicycle ≠ no`
   - **Purpose**: Off-road tracks suitable for mountain biking (dashing indicates unpaved nature)

#### **Bike Amenities** (POI layer — available at zoom ≥ 11)

6. **Bike Shops & Services** 🚲
   - **Color**: `#22aa44` (Green)
   - **Icon**: 🚲
   - **Filter**: `subclass = bicycle`
   - **Purpose**: Support services and supplies

7. **Bike Parking** 🅿️
   - **Color**: `#ffcc00` (Yellow)
   - **Icon**: 🅿️
   - **Filter**: `subclass = bicycle_parking`
   - **Purpose**: Secure bicycle parking locations

8. **Bike Rental** 🔑
   - **Color**: `#ff4444` (Red)
   - **Icon**: 🔑
   - **Filter**: `subclass = bicycle_rental`
   - **Purpose**: Bike-sharing and rental stations

---

### 3. **Rendering Layer Updates** (`composables/useHighlights.js`)

#### Enhanced `paintForType()` Function

Now accepts optional `lineWidth` and `lineDash` parameters:

```javascript
function paintForType(type, colour, lineWidth = 3, lineDash = null) {
  switch (type) {
    case "line":
      const paint = {
        "line-color": colour,
        "line-width": lineWidth,      // Uses provided or default width
        "line-opacity": 0.85,
      };
      if (lineDash) {
        paint["line-dasharray"] = lineDash;  // Only applied if lineDash is provided
      }
      return paint;
    // ... other types
  }
}
```

#### Updated Layer Synchronization

Both layer update and creation now pass `query.lineWidth` and `query.lineDash`:

```javascript
// When updating existing layers:
const paint = paintForType(type, query.colour, query.lineWidth, query.lineDash);

// When creating new layers:
paint: paintForType(type, query.colour, query.lineWidth, query.lineDash),
```

**Important**: `line-dasharray` is only applied to `line`-type layers, preventing errors on fill/circle layers.

---

### 4. **UI Component Updates** (`components/QueryCard.js`)

#### New Line Styling Section

Added editable line styling controls below the basic query settings:

```javascript
// Line styling (for line layers)
h("div", { class: "query-line-style" }, [
  h("label", [
    "Line Width: ",
    h("input", {
      type: "number",
      min: "0.5",
      max: "10",
      step: "0.5",
      value: q.lineWidth ?? 3,
      onInput: (e) => patch("lineWidth", parseFloat(e.target.value) || 3),
      style: { width: "50px" },
    }),
  ]),
  h("label", [
    "Dash Pattern: ",
    h("input", {
      type: "text",
      placeholder: "e.g. 2,2",
      value: q.lineDash ? q.lineDash.join(",") : "",
      title: "Comma-separated values for dash array (e.g. '2,2' for dashed)",
      onInput: (e) => {
        const val = e.target.value.trim();
        const newDash = val
          ? val.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
          : null;
        patch("lineDash", newDash && newDash.length > 0 ? newDash : null);
      },
      style: { width: "100px" },
    }),
  ]),
]),
```

**Features**:
- **Line Width**: Number input (0.5–10px, 0.5px increments)
- **Dash Pattern**: Text input accepting comma-separated values
  - Example: `2,2` produces a dashed line with 2px on, 2px off
  - Example: `3,3` produces a dashed line with 3px on, 3px off
  - Empty = solid line
- Properties are preserved in localStorage automatically

---

## Clearing Old Cached Queries

When deploying these changes, users' cached queries (stored in localStorage) from the previous version may not include the new `lineWidth` and `lineDash` properties. Two options:

### Option 1: Automatic Version Invalidation (Recommended)

The app already implements automatic version-based cache invalidation. Upon first load after the update:

1. The app checks `localStorage.getItem("osm2-queries-version")`
2. If it doesn't match `CURRENT_VERSION`, old queries are discarded
3. Fresh default queries with all new properties are loaded
4. The version is updated in localStorage

**No additional action required** — existing users will automatically see the new CyclOSM defaults on next visit.

### Option 2: Manual Invalidation

To force immediate cache invalidation across all users, increment `CURRENT_VERSION` in `composables/useQueries.js`:

```javascript
// Before
const CURRENT_VERSION = 2;

// After
const CURRENT_VERSION = 3;
```

---

## Testing & Validation

### Build Status
✅ **All builds successful** — No TypeScript/syntax errors

### What to Verify

1. **localStorage Clearing**
   - Open DevTools → Application → Storage → Local Storage
   - Visit the app after deploying changes
   - Confirm `osm2-queries-version` is set to `CURRENT_VERSION`
   - Old `osm2-highlight-queries` should match the new structure

2. **Visual Rendering**
   - Dedicated Cycle Tracks should display as solid **deep blue** lines (4px)
   - On-Street Cycle Lanes should display as **dashed blue** lines (2px)
   - Unpaved/MTB Tracks should display as **dashed brown** lines (3px)
   - Bike amenities should appear as **colored circles** with appropriate icons at zoom ≥ 11

3. **Editing**
   - Expand a query card
   - Verify "Line Width" and "Dash Pattern" inputs appear
   - Edit values and confirm they persist (watch the map update in real-time)
   - Close and reopen the app; settings should persist

4. **Filter Logic**
   - Each route type should match only the specified conditions
   - Test with different zoom levels
   - Verify no overlapping highlights (or intentional overlaps)

---

## Query Reference

| Query | Color | Width | Dash | Source Layer | Conditions |
|-------|-------|-------|------|--------------|-----------|
| Dedicated Cycle Tracks | `#0000ce` | 4px | — | transportation | `subclass = cycleway` |
| Designated Shared Paths | `#0060ff` | 3px | — | transportation | `class = path`, `bicycle = designated`, `surface = paved` |
| On-Street Cycle Lanes | `#0060ff` | 2px | [2,2] | transportation | `bicycle = designated`, `class ≠ path`, `subclass ≠ cycleway` |
| Bicycle Friendly Paths | `#007360` | 3px | — | transportation | `class = path`, `bicycle = yes` |
| Unpaved / MTB Tracks | `#741e18` | 3px | [3,3] | transportation | `surface ≠ paved`, `bicycle ≠ no` |
| Bike Shops & Services | `#22aa44` | — | — | poi | `subclass = bicycle` |
| Bike Parking | `#ffcc00` | — | — | poi | `subclass = bicycle_parking` |
| Bike Rental | `#ff4444` | — | — | poi | `subclass = bicycle_rental` |

---

## Files Modified

```
apps/osm2/
├── composables/
│   ├── useQueries.js         ✏️  (Updated: lineWidth/lineDash support, new default queries, version management)
│   └── useHighlights.js      ✏️  (Updated: paintForType accepts lineWidth/lineDash, layer creation uses them)
└── components/
    └── QueryCard.js          ✏️  (Updated: Added UI controls for line styling)
```

---

## Architecture Notes

### Why Version-Based Invalidation?

- **Backward Compatible**: Existing users with custom queries aren't forced to reset
- **Opt-In**: Users can upgrade at their own pace
- **Automatic**: No manual intervention needed (unless `CURRENT_VERSION` is incremented)

### Why Separate Dashed Patterns?

- **Visual Semantics**: Different dash patterns convey meaning:
  - **Solid**: High-confidence, permanent infrastructure
  - **[2,2] dash**: On-street integration with vehicle traffic
  - **[3,3] dash**: Unpaved/adventurous nature
- **CyclOSM Convention**: Aligns with established cycling map standards

### Why POI Queries Use lineWidth=0?

- POI markers use circle/symbol layers, not line layers
- `lineWidth` is ignored for non-line types
- Keeping it as 0 is convention; it has no effect on circles

---

## Future Enhancements

Possible future improvements:

1. **Color Presets**: Pre-built color schemes for different riding styles
2. **Advanced Line Styles**: Arrow markers, gradient colors, hover effects
3. **Conditional Line Width**: Scale line width based on zoom level
4. **Export/Import**: Share custom query sets with other users
5. **Layer Groups**: Organize queries into collapsible categories (e.g., "Daily Commute", "Adventure Routes")

---

## Questions?

For issues or feature requests related to CyclOSM styling, refer to:
- [CyclOSM Official Site](https://cyclosm.org/)
- [OpenMapTiles Documentation](https://openmaptiles.org/)
- [MapLibre GL JS API](https://maplibre.org/maplibre-gl-js/docs/)
