# Waymark JS Docs

## Setup

Make sure to install the dependencies:

```bash
# npm (npm|yarn) install
npm install
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Build

Build the application for production:

```bash
npm run generate
```

By default the build is generated for the live docs URL (`https://www.ogis.org/waymark-js/`). To generate it for a different URL (e.g. a local preview), set `NUXT_APP_BASE_URL` to the full URL including scheme and host.
An optional path is allowed, and a missing trailing slash is added automatically:

```bash
NUXT_APP_BASE_URL=https://www.ogis.org/waymark-js/v1/ npm run generate
```

## Screenshots

Capture full-page screenshots of every content page plus the 404 (not-found) page (iPad portrait, 768×1024) into `screenshots/`:

```bash
npm run screenshot
```

The script discovers pages from `content/` and also captures the 404 (not-found) page, starts its own Nuxt dev server on a free port in the ephemeral range 11000-11999 so your development server is left undisturbed, and renders each page using the system Chrome installation. The server is stopped automatically when the run completes.
