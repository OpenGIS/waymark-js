This project is in early development. Backwards compatibility is not needed at this time.

Right from the start, I want to emphasise that Waymark JS is all about rendering Maps and geographical data.

Waymark Instances are embedded applications that provide consumers an API for creating and customising interactive maps.

Waymark will achieves this. Instance API:

- Providing customisation through a config json object
- providing an interface for interacting with map data
- Handle Maplibre gl js for maps
- Vue JS for user interactivity
- Utilising the GeoJSON specification for json data storage

In essence, each instance is the representation of a config and geojson rendered in a provided container.

We need to set up the project to be modular with room to grow. Right now @src/Waymark.js which represents an instance is one giant file. An instance will be handling maplibre gl js map / vue js ui syncing, user actions (like displaying geojson).

It is also going to be working with alot of geojson, so I think utilising libraries like turf js it worthwhile.

Help me solidify these concepts and put a plan together for how we can refactor the project to better align with thi direction. We aren't trying to do everything in one pass, let's set the direction and ensure it will be well documented as the library expands.

Initially we won't be implmenting the geojson API, so let's focus on just wiring up map creation and getting the project architecture set up.
