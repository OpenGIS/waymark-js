import {
  shouldPinSwiftShader,
  writeSwiftShaderPin,
} from "./helpers/swiftShaderPin.js";

/**
 * Serialise the software rasteriser for runs that render the screenshots
 * project. See `helpers/swiftShaderPin.js` for why the pin exists.
 */
export default async function globalSetup() {
  if (shouldPinSwiftShader()) {
    writeSwiftShaderPin();
  }
}
