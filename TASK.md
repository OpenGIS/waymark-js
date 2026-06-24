We are in early library development, in the middle of setting up the Waymark JS library codebase.

Currently the UI supports two modes: view (currently empty) and debug which displays an "Instance snapshot".

No features have been implmented yet. This is because I want to get the library codebase structure and patterns right first.

---

Upon reviewing our work so far, we have made good progress, but I see that we are getting off track already.

I want to bring the initial library codebase inline with my view of the project.

By Inspecting src like @src/state/createInstanceSnapshot.js I can see that the terms in the codebase are not well defined and things are getting messy. So now seems like a good time to tigten up the codebase concepts.

I want to do a rethink, right down to the instance API constructor. This is the public API of the library and so fundemental.

I want to make instances fully serialisable to JSON.

Instances are created from a single json object and can be serialized into json.

I want to make instances a single transferrable object:

- Import/Export in a standard format
- Accepts and stores an config
- State is updated as user interacts
- Data

Let me try to show you what I am aiming for (treat as pseudocode):

```json
{
  // Configure initial map (optional)
  "config": {
    // Unique DOM element
    "id": "map",

    //
    "map": {
      // Any maplibre supported options
      "options": {}
    },
    "ui": {
      // We specify
      "mode": "debug"
    }
  },

  // The user's state is synced as they move the map, or change the UI
  "state": {
    "map": {
      // We need to define which options
      "options": {}
    },
    "ui": {
      "mode": "debug"
    }
  },

  // Geojson
  "data": {}
}
```

The above pseudocode introduces top-level:

- ID - optional. should be html id attr in dom, or random created
- Config - optional. used to configure library.
- State - optional. used to sync user state between sessions
- Data - optional. used to load

I really need some help figuring out how to implement this new direction.

You can see that both state and config expose "map" and "ui" keys. I'm thinking of referring to these as modules. An instance has a map (maplibre) and ui (vue), both of which can be passed configuration and maintain state.

I think we need to promote the map and ui to be top level modules of the instance and referred as such in the docs/ I think we need to solidify the documentation for each by creating 4.map.md and 5.ui.md and then @docs/3.instances.md should link to this and avoid repetition.

All modules should have events. Right now ui mode change has no events. We need to set this pattern.

Right now geojson data rendering is not implemented and is not required.

I want you to ask lots of questions to ensure we are on the same page. I am unsure practically how this should be structured so that it can grow with the project.

We want to end up with a simple, JSON Instance API that is well documented and flexible.

---

Remember, this project is in initial development and refactors do not require backwards compatibility. Spend time getting the pattern right, we are laying a foundation here.
