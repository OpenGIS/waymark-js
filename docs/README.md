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
