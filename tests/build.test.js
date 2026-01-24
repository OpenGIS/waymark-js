// @vitest-environment node
import { describe, it, expect } from "vitest";
import { exec } from "child_process";

describe("Build", () => {
  it("should build without errors", () => {
    return new Promise((resolve, reject) => {
      exec("npm run build", (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          reject(error);
        } else {
          // console.log(`stdout: ${stdout}`);
          expect(error).toBeNull();
          resolve();
        }
      });
    });
  }, 30000); // 30 second timeout
});
