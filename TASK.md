Our first attempt at the new Vue JS UI is going well.

Currently the UI simply displays "Instance snapshot" to show that reactivity is wired correctly, and doesn't yet have any features.

This is because I want to get the library codebase structure and patterns right first.

The next step is creating a javascript event pattern that we can lean on when ensuring the instance is kept in sync in a performant way.

The goal would be to add a lightweight, but flexible event implementation that is both used internally by the core instance, but also allows library consumers to tap in to waymark js events, promoting extensibility.

As an example, currently the "Instance Snapshot" shows the live map view. To reduce computation, it might be better to update only on move end, by using events. This is just a simple example, expect that we will not only want to support map updates, but also config changes and geojson updates will also need to be supported.

Propose a plan for events, I can see forsee all core modules emitting events, so this should be done in a structured way. The instance container should be used to fire events, so consumers can easily target the instance.

To demonstrate that events are working, the @src/dev.js entry should be updated to console log any events on the instance container.

Remember, this project is in initial development and refactors do not require backwards compatibility. Spend time getting the pattern right, we are laying a foundation here.
