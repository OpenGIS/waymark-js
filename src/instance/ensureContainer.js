function createRandomContainerId() {
    return `waymark-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ensure a map container exists and return its ID.
 *
 * @param {string} [id]
 * @returns {string}
 */
export function ensureContainer(id) {
    if (id) {
        if (!document.getElementById(id)) {
            throw new Error(`Waymark container "${id}" was not found.`);
        }

        return id;
    }

    const generatedId = createRandomContainerId();
    const container = document.createElement("div");
    container.id = generatedId;
    document.body.appendChild(container);

    return generatedId;
}
