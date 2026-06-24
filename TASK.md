We are in the middle of setting up the Waymark JS library codebase.

Currently the UI simply displays "Instance snapshot" to show that reactivity is wired correctly, and doesn't yet have any features.

This is because I want to get the library codebase structure and patterns right first.

---

The next step is to build out the UI. I want the UI to have a top level "mode". To start with, these will be: "view" (default) and "debug".

The UI Mode establishes what controls and content is displayed by the UI. Example future modes might be "record", "navigate" or "edit" (examples only - do not implement these yet).

the initial ui mode is provided in the config using config.ui.mode

the shell is populated dynamically with the elements that make up that mode:

- View = no elements (yet)
- Debug = single snapshot

we also need to handle switching modes programatically (no external API required at this time)

when the ui mode is changed, the shell is emptied and repopulated with the new UI. use the vue js skill to plan this multi-mode UI pattern. SFCs should be used and nested appropriately in @src/ui/

I believe this may require a rethink on the current snapshot ui.hasAppShell implementation, which is just a placeholder and should be removed.

The UI should always have a shell, it's content determined by the mode. switching modes should remove and then add the relevant components. this means initially the view mode will be an empty shell.

Set view as default, but @src/dev.js should demonstate one mode per instance.

This will also be a good opportunity to test our automated testing/documentation setup, because these changes will break the existing API. Initial failing tests means things are working!

---

Remember, this project is in initial development and refactors do not require backwards compatibility. Spend time getting the pattern right, we are laying a foundation here.
