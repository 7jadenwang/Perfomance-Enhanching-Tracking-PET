import { test, expect } from "@playwright/test";
test("caches program images and supports offline records and backups", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Show up. Measure. Adapt." }),
  ).toBeVisible();
  await page.getByLabel("CMJ trial 1 (cm)").fill("30");
  await page.getByLabel("CMJ trial 2 (cm)").fill("31");
  await page.getByLabel("CMJ trial 3 (cm)").fill("32");
  await page.getByRole("button", { name: "Save morning" }).click();
  await expect(page.getByText("31.0 cm", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("31.0 cm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByText("Original plan images (1)").click();
  const img = page.getByRole("img", { name: "April_W1D1.jpg" });
  await expect(img).toBeVisible();
  expect(
    await img.evaluate(
      (e: HTMLImageElement) => e.complete && e.naturalWidth > 0,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("pet-backup.json");
});
test("does not advertise offline readiness when caching fails", async ({
  page,
}) => {
  await page.route("**/program/April/April_W1D1.jpg", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByText("Offline unavailable · retry", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
});

test("a waiting service-worker update does not discard an open entry", async ({
  page,
}) => {
  const fs = await import("node:fs/promises");
  const original = await fs.readFile("dist/sw.js", "utf8");
  try {
    await page.goto("/");
    await expect(
      page.getByText("Offline ready", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Program", exact: true }).click();
    await page
      .getByRole("button", { name: "April W1 D1", exact: true })
      .click();
    await page.getByRole("button", { name: "Log this session" }).click();
    await page.getByLabel("Actual duration (minutes)").fill("42");
    await fs.writeFile("dist/sw.js", original + "\n// e2e update revision\n");
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r!.update();
    });
    await expect(
      page.getByRole("button", {
        name: "Update ready · save entries before reload",
      }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("Actual duration (minutes)")).toHaveValue(
      "42",
    );
    page.once("dialog", (d) => d.dismiss());
    await page
      .getByRole("button", {
        name: "Update ready · save entries before reload",
      })
      .click();
    await expect(page.getByLabel("Actual duration (minutes)")).toHaveValue(
      "42",
    );
  } finally {
    await fs.writeFile("dist/sw.js", original);
  }
});
