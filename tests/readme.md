### Testing

Tests will mirror the documentation structure to ensure full coverage of documented features.

```
Waymark-JS/
├── docs/
│   └── content/
│       ├── 1.index.md
│       ├── 2.map.md
│       ├── 3.viewer.md
│       ├── 4.editor.md
│       └── 5.customise.md
├── tests/
│   ├── setup.js          # Global test setup (loads globals like $, L)
│   └── docs/
│       ├── 1.index.test.js
│       ├── 2.map.test.js
│       ├── 3.viewer.test.js
│       ├── 4.editor.test.js
│       └── 5.customise.test.js
├── vite.config.js        # Vite/Vitest configuration
└── package.json
```

## Handling Legacy Code (Non-Module)

Since the source code (`src/js/*.js`) uses global function declarations and is not modular (ESM), we cannot simply `import` the files.
**Strategy**:

1. In `tests/setup.js`, we will use `fs` to read the source files.
2. We will execute the file contents in the global scope (using `window.eval` or similar) to register `Waymark_Map`, `Waymark_Map_Viewer`, etc., on the `window` object, mimicking the browser behavior.
3. jQuery and Leaflet will be attached to `window` before loading the source code.

## Test-Documentation Synchronization

To keep tests and docs in sync:

1. **Naming Convention**: Test files correspond 1:1 with doc files.
2. **Section Mapping**: `describe` blocks in tests will match the headers in the markdown files.
   - Example: `## Map Options` in `2.map.md` -> `describe('Map Options', ...)` in `2.map.test.js`.
3. **Concept Verification**: Tests will implement the code examples found in the docs and assert the expected outcome.

## Example Test Structure (`tests/docs/2.map.test.js`)

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('2. Map Configuration', () => {
  let waymark;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="waymark-map"></div>';
  });

  describe('Basic Initialization', () => {
    it('should initialize the map with default options', () => {
      // Corresponds to basic usage example in docs
      waymark = new Waymark_Map();
      waymark.init({
        map_div_id: 'waymark-map'
      });

      expect(document.querySelector('.leaflet-container')).toBeTruthy();
    });
  });

  describe('Loading Data', () => {
    it('should load GeoJSON data', () => {
      waymark = new Waymark_Map();
      waymark.init();

      const geojson = { ... }; // Example data from docs
      waymark.load_json(geojson);

      // Assertions to verify data is on map
    });
  });
});
```
