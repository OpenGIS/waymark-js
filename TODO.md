## TODO: full naming alignment project plan

> [!NOTE]
> This is a project-planning checklist only. We prioritise simplicity and consistency over backwards compatibility.

1. Define and lock one canonical naming convention for the repo:
   - camelCase identifiers
   - uppercase acronyms in identifiers (for example `exampleJSON`, `styleURL`, `attributionHTML`)
   - one canonical term per concept (no parallel synonyms)
2. Inventory identifiers across `src/`, `tests/`, `docs/`, and `scripts/` that break the convention or duplicate meaning.
3. Group findings into rename domains:
   - public API/document JSON keys
   - internal runtime/source identifiers
   - test names and fixtures
   - docs prose and examples
4. Produce a single canonical naming map (`current -> canonical`) for every item in scope.
5. Split implementation into ordered, verifiable batches:
   - batch A: docs/tests naming-only cleanup
   - batch B: source/runtime renames
   - batch C: contract scripts/generated artefacts and final docs polish
6. For each batch, list exact files to touch and exact verification commands to run.
7. Execute one batch at a time, keeping docs/tests in sync within the same batch.
8. Run full verification after each batch:
   - `npm run format:check`
   - `npm run docs:sync`
   - `npm test`
   - `npm run test:browser`
9. Add a final naming conventions section update to `docs/2.development.md` with confirmed examples from the completed rename.
10. Capture the final canonical naming map in docs so future contributors have one source of truth.
