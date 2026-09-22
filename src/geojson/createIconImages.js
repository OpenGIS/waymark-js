import spriteContent from "../icons/waymark-icons.svg?raw";

/**
 * Parse the waymark-icons SVG sprite and register type icons with MapLibre.
 *
 * For each type with an `icon` property, extracts the matching `<symbol>`
 * from the sprite, renders it to a canvas with the type's circle-color as
 * fill, and registers it via `map.addImage()`.
 *
 * @param {import('maplibre-gl').Map} map
 * @param {Record<string, { icon?: string, paint?: { circle?: { 'circle-color'?: string } } }>} types
 * @returns {Promise<string[]>} registered image IDs
 */
export async function loadTypeIcons(map, types) {
  if (!types) {
    return [];
  }

  const registered = [];

  for (const [typeKey, typeDef] of Object.entries(types)) {
    const iconName = typeDef.icon;
    const fillColor = typeDef.paint?.circle?.["circle-color"];
    if (!iconName || !fillColor) {
      continue;
    }

    const svgString = buildIconSVG(spriteContent, iconName, fillColor);
    if (!svgString) {
      console.warn(
        `[waymark] Icon "${iconName}" not found in sprite for type "${typeKey}"`,
      );
      continue;
    }

    let imageData;
    try {
      imageData = await renderSVG(svgString, 16, 16);
    } catch (err) {
      console.warn(
        `[waymark] Failed to render icon "${iconName}" for type "${typeKey}":`,
        err,
      );
      continue;
    }

    const imageId = typeKey;

    if (map.hasImage(imageId)) {
      map.updateImage(imageId, imageData);
    } else {
      map.addImage(imageId, imageData);
    }

    registered.push(imageId);
  }

  return registered;
}

/**
 * Extract a symbol from the SVG sprite and build a standalone SVG
 * with an explicit fill color.
 *
 * @param {string} spriteContent
 * @param {string} iconId
 * @param {string} fillColor
 * @returns {string|null}
 */
function buildIconSVG(spriteContent, iconId, fillColor) {
  const match = spriteContent.match(
    new RegExp(`<symbol[^>]*id="${iconId}"[^>]*>(.*?)</symbol>`),
  );

  if (!match) {
    return null;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="${fillColor}">${match[1]}</svg>`;
}

/**
 * Render an SVG string to ImageData.
 *
 * @param {string} svgString
 * @param {number} width
 * @param {number} height
 * @returns {Promise<ImageData>}
 */
function renderSVG(svgString, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(ctx.getImageData(0, 0, width, height));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load icon SVG"));
    };

    img.src = url;
  });
}
