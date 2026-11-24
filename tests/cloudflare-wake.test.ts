import assert from "node:assert/strict";
import test from "node:test";
import { signalWake } from "../scripts/cloudflare-wake.ts";
const start = Date.UTC(2026, 10, 24);
const settings = {
  SPRITE_ORIGIN: "https://test-only.sprites.app",
  WAKE_TOKEN: "01".repeat(32),
  WINDOW_START: new Date(start).toISOString(),
  WINDOW_END: new Date(start + 1800000).toISOString(),
};
test("cron posts only the authenticated empty signal in its finite window", async () => {
  let calls = 0;
  const transport: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, settings.SPRITE_ORIGIN + "/wake");
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, undefined);
    assert.equal(init?.redirect, "error");
    assert.deepEqual(init?.headers, {
      Authorization: "Bearer " + settings.WAKE_TOKEN,
    });
    return new Response(null, { status: 204 });
  };
  await signalWake(start, settings, transport, start);
  await signalWake(start, settings, transport, start + 1800000);
  assert.equal(calls, 1);
});
test("cron rejects redirects, failed TLS, error statuses and unexpected origins", async () => {
  for (const status of [301, 307, 401, 429, 500])
    await assert.rejects(
      signalWake(
        start,
        settings,
        async () => new Response(null, { status }),
        start,
      ),
    );
  await assert.rejects(
    signalWake(
      start,
      settings,
      async () => {
        throw TypeError("TLS failure");
      },
      start,
    ),
  );
  for (const origin of [
    "http://test-only.sprites.app",
    "https://example.org",
    "https://test-only.sprites.app/other",
    "https://test-only.sprites.app@other.example",
  ])
    await assert.rejects(
      signalWake(
        start,
        { ...settings, SPRITE_ORIGIN: origin },
        async () => {
          assert.fail("outbound request");
        },
        start,
      ),
      /Invalid wake configuration/,
    );
});
