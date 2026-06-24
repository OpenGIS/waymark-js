We are in the middle of setting up the Waymark JS library codebase.

Currently the UI simply displays "Instance snapshot" to show that reactivity is wired correctly, and doesn't yet have any features.

This is because I want to get the library codebase structure and patterns right first.

---

The next step is to build out the UI. I want the UI to have a top level "mode". To start with, these will be: "view" (default) and "debug".

The UI Mode establishes what controls and content is displayed by the UI. Example future modes might be "record", "navigate" or "edit" (examples only - do not implement these yet).

Let's keep this simple initially. view mode displays only the map, while debug mode displays the "Instance snapshot".

the ui mode is provided in the config using config.ui.mode.

Set view as default, but @src/dev.js should demonstate one mode per instance.

This will also be a good opportunity to test our automated testing/documentation setup, because these changes will break the existing API. Initial failing tests means things are working!

---

Remember, this project is in initial development and refactors do not require backwards compatibility. Spend time getting the pattern right, we are laying a foundation here.
