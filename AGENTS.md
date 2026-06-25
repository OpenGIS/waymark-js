# Agent notes

Start with [README.md](README.md) for the project overview.

Then read [docs/2.development.md](docs/2.development.md) for contributor workflow, testing, and doc/test synchronisation rules.

Skill generation scripts live in [`scripts/`](scripts/) (currently `scripts/skill-md.js`).

Runtime behaviour may inject sensible defaults for internal execution, but serialisation (`toJSON()`) should omit runtime-injected defaults and preserve only explicitly authored values.
