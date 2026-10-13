import { test, expect } from "@playwright/test";
test("logs actual partial work without copying targets into completed totals", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Program start date").fill("2026-10-13");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByRole("button", { name: "Log this session" }).click();
  await page.getByRole("button", { name: "Copy planned sets" }).click();
  await page.getByRole("button", { name: "Save workout" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.getByText("0 measured sessions")).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByRole("button", { name: "Log this session" }).click();
  await page.getByLabel("Session status").selectOption("partial");
  await page.getByLabel("Actual duration (minutes)").fill("60");
  await page.getByLabel("Actual session RPE").fill("6");
  await page.getByLabel("Completed set").first().check();
  await page.getByRole("button", { name: "Save workout" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.getByText("360 AU", { exact: true }).first()).toBeVisible();
});
test("records a morning CMJ and preserves it on reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("CMJ trial 1 (cm)").fill("30");
  await page.getByLabel("CMJ trial 2 (cm)").fill("31");
  await page.getByLabel("CMJ trial 3 (cm)").fill("32");
  await page.getByRole("button", { name: "Save morning" }).click();
  await expect(page.getByText("31.0 cm", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("31.0 cm", { exact: true })).toBeVisible();
});

test("matches measured velocity only after confirming the target metric", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByRole("button", { name: "Log this session" }).click();
  await page.getByRole("button", { name: "Copy planned sets" }).click();
  await page
    .getByText("Tempo and measured velocity", { exact: true })
    .first()
    .click();
  await page.getByLabel("Set-average velocity (m/s)").first().fill("1.5");
  await page
    .getByLabel("Source target velocity metric")
    .first()
    .selectOption("mean");
  await expect(
    page.getByText("Target comparison: within", { exact: true }).first(),
  ).toBeVisible();
});

test("imports a reviewed backup and preserves calibration when saving settings", async ({
  page,
}) => {
  const { initialState } = await import("../../src/domain/schema");
  const { makeMorning } = await import("../../src/domain/fixtures");
  const state = initialState();
  state.startDate = "2026-10-13";
  state.mornings = Array.from({ length: 14 }, (_, i) =>
    makeMorning({
      id: String(i),
      localDate: `2026-10-${String(i + 1).padStart(2, "0")}`,
      trials: [30 + (i % 2), 30 + (i % 2), 30 + (i % 2)].map((heightCm) => ({
        heightCm,
        excluded: false,
        reason: "",
      })),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await expect(
    page.getByText("Compatible backup:", { exact: false }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirm replacement" }).click();
  await page.getByRole("button", { name: "Establish baseline" }).click();
  await expect(page.getByText(/Baseline 30.5 cm/)).toBeVisible();
  await page.getByLabel("Rowing machine").selectOption("available");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText(/Baseline 30.5 cm/)).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.screenshot({ path: "/tmp/pet-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/pet-desktop.png", fullPage: true });
});
test("rejects corrupt backup without replacing existing morning records", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("CMJ trial 1 (cm)").fill("30");
  await page.getByRole("button", { name: "Save morning" }).click();
  await expect(page.getByText("30.0 cm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import backup").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Existing records are unchanged",
  );
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByText("30.0 cm", { exact: true })).toBeVisible();
});

test("reopens historical workout identity after its session is rescheduled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Program start date").fill("2026-10-13");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByRole("button", { name: "Log this session" }).click();
  await page.getByLabel("Actual duration (minutes)").fill("42");
  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByText("Saved on this device").last()).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByLabel("Reschedule date").fill("2026-11-10");
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByRole("button", { name: "Open saved workout" }).click();
  await expect(page.getByLabel("Actual duration (minutes)")).toHaveValue("42");
  await expect(page.getByText("TRAINING LOG · 2026-10-13")).toBeVisible();
});

test("retains an unsaved entry and offers export when persistence fails", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "April W1 D1", exact: true }).click();
  await page.getByRole("button", { name: "Log this session" }).click();
  await page.getByLabel("Actual duration (minutes)").fill("42");
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByRole("alert")).toContainText("Save failed");
  await expect(page.getByLabel("Actual duration (minutes)")).toHaveValue("42");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export this entry" }).click();
  expect((await download).suggestedFilename()).toBe("pet-unsaved-workout.json");
});
