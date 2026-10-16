import { test, expect } from "@playwright/test";
test("saves half-point recovery ratings, records rest as zero, and zooms measured axes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Program start date").fill("2026-10-12");
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByLabel("Training date", { exact: true }).fill("2026-10-13");
  for (const name of [
    "Sleep quality (1 poor–10 good)",
    "Fatigue (1 low–10 high)",
    "Soreness (1 low–10 high)",
    "Stress (1 low–10 high)",
  ]) {
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      "step",
      "0.5",
    );
    await page.getByLabel(name, { exact: true }).fill("6.5");
  }
  await page
    .getByLabel("Body mass (kg, optional)", { exact: true })
    .fill("75.1");
  await page.getByLabel("CMJ trial 1 (cm)").fill("30");
  await page.getByRole("button", { name: "Save morning" }).click();
  await page.reload();
  await page.getByLabel("Training date", { exact: true }).fill("2026-10-13");
  await expect(
    page.getByLabel("Fatigue (1 low–10 high)", { exact: true }),
  ).toHaveValue("6.5");
  await page.getByLabel("Training date", { exact: true }).fill("2026-10-14");
  await page
    .getByLabel("Body mass (kg, optional)", { exact: true })
    .fill("75.3");
  await page.getByLabel("CMJ trial 1 (cm)").fill("30.4");
  await page.getByRole("button", { name: "Save morning" }).click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page
    .getByText("Correct a rest / training day", { exact: true })
    .click();
  await page.getByLabel("Activity date", { exact: true }).fill("2026-10-13");
  await page.getByLabel("Daily activity annotation").selectOption("rest");
  await page
    .getByRole("button", { name: "Session demand trends data", exact: true })
    .click();
  const restRows = page
    .getByRole("table", { name: "Session demand trends data" })
    .locator("tbody tr")
    .filter({ hasText: "2026-10-13" });
  await expect(restRows).toHaveCount(3);
  for (const row of await restRows.all())
    await expect(row.locator("td").nth(2)).toHaveText("0.00");
  for (const title of ["CMJ height", "Body mass"]) {
    const chart = page
      .locator("section.chart")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(chart.getByText(/Zoomed Y-axis/)).toBeVisible();
    expect(
      Number(
        await chart.locator("svg > g").first().locator("text").textContent(),
      ),
    ).toBeGreaterThan(0);
    await chart.screenshot({
      path:
        title === "CMJ height"
          ? "/tmp/pet-cmj-zoom.png"
          : "/tmp/pet-bodymass-zoom.png",
    });
  }
  await page.reload();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page
    .getByText("Correct a rest / training day", { exact: true })
    .click();
  await page.getByLabel("Activity date", { exact: true }).fill("2026-10-13");
  await expect(page.getByLabel("Daily activity annotation")).toHaveValue(
    "rest",
  );
});
