I want to improve the Instance concept and improve the Instance API. I also want to utilise Vue JS for rendering Instance UIs.

Waymark should not be exported, but rather a instance contructor. The instance constructor should have the following shape:

createInstance(id, config, geojson)

All optional:

- ID is the HTML id attribute of where to render the Instance. If omitted, a random ID is generated and an element is appended to <body />

- Config is the waymark config JSON object. If omitted, default config is used. Any config keys are deeply merged into default config. I also want the default config to live as a .json in the library that represents the single source of truth for the default config.

- GeoJSON if provided will be rendered initially

Refactor the current project to better align with my Instance API vision. Remember no backwards comapibility is required, we are trying to get the patten right to allow the project to grow. Ensure the documentation and testing is consistent.

---

Under the hood, each Instance is a Vue JS app that is mounted to the DOM. Each instance will have multiple (optional) UI components. The Vue based UI does not need to be implemented at this stage.

Waymark JS should keep track of the instances on the page (referenced by container ID).

I think it's also time to restructure the src/ to better reflect the instance api - which each instance is going to have it's own config, map & UI. Use the vue skill to plan how to best structure the library so that it is modular.

I want the entire project codebase to feel intuative and reflect that multiple instances can be created, each executing in isolation.

Put together a plan for this refactor. Remember no backwards comptibility is required, let's get the project wiring/skeleton right first before we add any functionality.
