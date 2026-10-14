import {
  removeSwiftShaderPin,
  shouldPinSwiftShader,
} from "./helpers/swiftShaderPin.js";

/**
 * Remove the transient SwiftShader pin written by `global-setup.js`. Kept
 * symmetric with the setup predicate so a functional-only run never touches it.
 */
export default async function globalTeardown() {
  if (shouldPinSwiftShader()) {
    removeSwiftShaderPin();
  }
}
