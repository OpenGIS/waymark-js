/**
 * Playwright `test`/`expect` extended with an external-request guard.
 *
 * Every test's browser context installs a route that allows only same-machine
 * requests (`localhost`, `127.0.0.1`, `[::1]`, any port) plus non-http(s)
 * resources such as `data:`, `blob:` and `about:`. Any other http(s) request is
 * aborted and recorded; the guard asserts the record is empty in teardown, so a
 * stray external request fails the test loudly with the offending URL and can
 * never pass silently.
 *
 * Specs must import `test` and `expect` from this module (not from
 * `@playwright/test`) for the guard to be active.
 */
import { expect, test as base } from "@playwright/test";
import { isExternalRequest } from "./mapAssets.js";

export { expect };

export const test = base.extend({
  externalRequests: [
    async ({ context }, use) => {
      /** @type {string[]} */
      const externalRequests = [];

      await context.route("**/*", (route) => {
        const url = route.request().url();

        if (!isExternalRequest(url)) {
          return route.continue();
        }

        externalRequests.push(url);
        return route.abort();
      });

      await use(externalRequests);

      expect(
        externalRequests,
        "External network requests are not permitted; the vendored basemap must be the only style source.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
