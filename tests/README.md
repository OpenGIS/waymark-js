# Tests

Tests mirror the documentation structure: every doc page has a matching unit and/or browser test file.

## Structure

```
tests/
├── setup.js                     # Vitest global setup (DOM reset before each test)
├── docs/                        # Unit tests (Vitest + jsdom)
│   └── 1.start.test.js          # Mirrors docs/1.start.md
└── browser/                     # Browser tests (Playwright against Vite dev server)
    └── 1.start.test.js
```

## Running tests

```bash
npm test              # Unit tests (Vitest, jsdom)
npm run test:watch    # Unit tests in watch mode
npm run test:browser  # Browser tests (Playwright, Chromium)
npm run test:coverage # Unit test coverage report
```

## Conventions

- **Unit tests** (`tests/docs/*.test.js`) — mock `maplibre-gl`; no WebGL or network required.
- **Browser tests** (`tests/browser/*.test.js`) — run against the live Vite dev server at `http://localhost:5173`; Playwright starts the server automatically.
- **Naming** — `describe` blocks match the `##` section headings in the corresponding doc file exactly.
- **Sync** — when a doc page changes, update the corresponding test file to match.

## Test–doc synchronisation

| Test file | Doc file |
| --- | --- |
| `tests/docs/1.start.test.js` | `docs/1.start.md` |
| `tests/browser/1.start.test.js` | `docs/1.start.md` |
