import { describe, it, expect } from "vitest";
import { LocalCallbackServer } from "../src/auth/callback-server.js";

describe("LocalCallbackServer", () => {
  it("should start on a random port and return redirect URI", async () => {
    const server = new LocalCallbackServer("/callback");
    const promise = server.start(undefined, 5000);

    // Wait for server to bind
    await new Promise((r) => setTimeout(r, 100));

    const port = server.getPort();
    expect(port).toBeGreaterThan(0);
    expect(server.getRedirectUri()).toBe(
      `http://127.0.0.1:${port}/callback`,
    );

    // Simulate callback
    const callbackUrl = `http://127.0.0.1:${port}/callback?code=test-code&state=test-state`;
    const response = await fetch(callbackUrl);
    expect(response.status).toBe(200);

    const result = await promise;
    expect(result.code).toBe("test-code");
    expect(result.state).toBe("test-state");
  });

  it("should reject on error callback", async () => {
    const server = new LocalCallbackServer("/callback");
    const promise = server.start(undefined, 5000);

    // Attach rejection handler immediately to avoid unhandled rejection
    const rejection = expect(promise).rejects.toThrow("access_denied");

    await new Promise((r) => setTimeout(r, 100));
    const port = server.getPort();

    const callbackUrl = `http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied`;
    await fetch(callbackUrl);

    await rejection;
  });

  it("should reject on timeout", async () => {
    const server = new LocalCallbackServer("/callback");
    const promise = server.start(undefined, 200); // 200ms timeout
    await expect(promise).rejects.toThrow("timed out");
  });

  it("should return 404 for non-callback paths", async () => {
    const server = new LocalCallbackServer("/callback");
    const promise = server.start(undefined, 5000);

    await new Promise((r) => setTimeout(r, 100));
    const port = server.getPort();

    const response = await fetch(`http://127.0.0.1:${port}/other`);
    expect(response.status).toBe(404);

    // Clean up — send valid callback to resolve the promise
    await fetch(
      `http://127.0.0.1:${port}/callback?code=c&state=s`,
    );
    await promise;
  });
});
