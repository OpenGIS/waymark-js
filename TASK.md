We need to strengthen what an instance is. Currently it is loosely defined in the library, broken up into unecessary chunks @src/instance/ I want to restructure @src/ to reflect this, I also want the readme and docs/ to reflect this.

Instances are the core concept of Waymark JS. They provide a simple interface to consumers, encapsulating:

- Configuration (JSON - e.g. map options, data styles)
- Map rendering (Maplibre GL JS)
- Data visualisation (GeosJSON)
- Dynamic User Interface (Vue JS)
- State (serialisable into JSON e.g. current map view, ui state)

I want to adopt a centralised pattern where Instances are core. With config/geojson/ui/state/map being top level, well documented modules.

Waymark JS should act as a wrapper where possible, adding a little sugar to existing technologies. For example we allow consumers to provide maplibre mapoptions to instances, keeping the waymark js implementation thin, while being flexible.

It is important that the project documentation, folder structure and file names reflect the core concepts.

Ask questions if needed to better understand the direction I want to take before considering multiple approaches.

Remember, this project is in initial development and refactors do not require backwards compatibility.

I am trying to get the foundation right now before the library adds more functionality.
