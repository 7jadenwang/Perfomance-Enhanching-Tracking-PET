import { it, expect } from "vitest";
import { validClientConfig } from "../src/sync/client";
it("requires public Supabase configuration and rejects privileged key formats", () => {
  expect(validClientConfig(undefined, undefined)).toBe(false);
  expect(
    validClientConfig("https://example.supabase.co", "sb_secret_test"),
  ).toBe(false);
  expect(
    validClientConfig("https://example.supabase.co", "sb_publishable_test"),
  ).toBe(true);
  expect(validClientConfig("http://example.com", "sb_publishable_test")).toBe(
    false,
  );
});
