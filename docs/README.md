# Waymark JS Docs

## Setup

Make sure to install the dependencies:

```bash
# pnpm (npm|yarn) install
pnpm install
```

## Development Server

Start the development server on http://localhost:3000

```bash
pnpm run dev
```

## Build

Build the application for production:

```bash
pnpm run generate
```

By default the build is generated for the live docs URL (`https://www.ogis.org/waymark-js/`). To generate it for a different URL (e.g. a local preview), set `NUXT_APP_BASE_URL` to the full URL including scheme and host.
An optional path is allowed, and a missing trailing slash is added automatically:

```bash
NUXT_APP_BASE_URL=https://example.com/docs/ pnpm run generate
```
