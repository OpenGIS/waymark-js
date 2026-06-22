/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {unknown} value
 */
function clone(value) {
    if (Array.isArray(value)) {
        return value.map((item) => clone(item));
    }

    if (isObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, clone(item)]),
        );
    }

    return value;
}

/**
 * Deeply merge two values.
 *
 * Objects are merged by key.
 * Arrays are replaced (never merged by index).
 *
 * @param {unknown} base
 * @param {unknown} override
 */
export function deepMerge(base, override) {
    if (Array.isArray(override)) {
        return clone(override);
    }

    if (!isObject(override)) {
        return clone(override);
    }

    const baseObject = isObject(base) ? base : {};
    const keys = new Set([
        ...Object.keys(baseObject),
        ...Object.keys(override),
    ]);

    return Object.fromEntries(
        [...keys].map((key) => {
            if (!(key in override)) {
                return [key, clone(baseObject[key])];
            }

            const baseValue = baseObject[key];
            const overrideValue = override[key];

            if (Array.isArray(overrideValue)) {
                return [key, clone(overrideValue)];
            }

            if (isObject(overrideValue)) {
                return [key, deepMerge(baseValue, overrideValue)];
            }

            return [key, clone(overrideValue)];
        }),
    );
}
