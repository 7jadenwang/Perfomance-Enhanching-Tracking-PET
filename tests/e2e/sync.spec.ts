import { test, expect, type BrowserContext } from "@playwright/test";
test("explains missing sync configuration while retaining local training", async ({
  page,
}) => {
  test.skip(
    !!process.env.VITE_SUPABASE_URL,
    "Configured build uses account controls",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByText(
      "Sync is not configured. Your records are saved in this browser.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("two independent devices converge saved dates and preserve same-record conflicts", async ({
  browser,
}) => {
  test.skip(
    !process.env.VITE_SUPABASE_URL,
    "Run with public browser-test config",
  );
  const docs = new Map<string, any>(),
    requests = new Map<string, any>(),
    offlineContexts = new Set<BrowserContext>();
  const setup = async (context: BrowserContext) => {
    await context.route("https://pet-sync.example/**", async (route) => {
      if (offlineContexts.has(context)) {
        await route.abort("internetdisconnected");
        return;
      }
      const req = route.request(),
        url = req.url();
      let body: any;
      if (url.includes("/auth/v1/token"))
        body = {
          access_token: "test-token",
          refresh_token: "test-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            email: "athlete@example.com",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-10-13T00:00:00Z",
          },
        };
      else if (url.includes("pet_sync_snapshot")) body = [...docs.values()];
      else if (url.includes("pet_sync_commit")) {
        const { request_id, changes } = req.postDataJSON();
        body = requests.get(request_id);
        if (!body) {
          const conflicts = changes
            .filter(
              (d: any) =>
                (docs.get(d.kind + "|" + d.key)?.revision ?? 0) !==
                d.baseRevision,
            )
            .map((d: any) => ({
              kind: d.kind,
              key: d.key,
              remote: docs.get(d.kind + "|" + d.key) ?? null,
            }));
          if (conflicts.length) body = { status: "conflict", conflicts };
          else {
            const documents = changes.map((d: any) => ({
              ...d,
              revision: d.baseRevision + 1,
            }));
            documents.forEach((d: any) => docs.set(d.kind + "|" + d.key, d));
            body = { status: "acknowledged", documents };
            requests.set(request_id, body);
          }
        }
      } else body = {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(body),
      });
    });
  };
  const c1 = await browser.newContext(),
    c2 = await browser.newContext();
  await setup(c1);
  await setup(c2);
  const pc = await c1.newPage(),
    phone = await c2.newPage();
  const login = async (page: typeof pc) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Account email").fill("athlete@example.com");
    await page.getByLabel("Account password").fill("test-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Preview account link" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Preview account link" }).click();
  };
  await login(pc);
  await pc.getByRole("button", { name: "Upload this device history" }).click();
  await expect(pc.getByText("Synced", { exact: true }).first()).toBeVisible();
  await pc.getByRole("button", { name: "Today", exact: true }).click();
  await pc.getByLabel("Training date", { exact: true }).fill("2026-10-13");
  await pc.getByLabel("CMJ trial 1 (cm)").fill("33");
  await pc.getByRole("button", { name: "Save morning" }).click();
  await pc.getByRole("button", { name: "Settings", exact: true }).click();
  await pc.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect
    .poll(
      () =>
        [...docs.values()].find((d) => d.kind === "morning")?.payload.trials[0]
          .heightCm,
    )
    .toBe(33);
  await login(phone);
  await phone.getByRole("button", { name: "Use cloud history" }).click();
  await phone.getByRole("button", { name: "Today", exact: true }).click();
  await phone.getByLabel("Training date", { exact: true }).fill("2026-10-13");
  await expect(phone.getByLabel("CMJ trial 1 (cm)")).toHaveValue("33");
  // Keep a dirty draft while a validated incoming record changes.
  await phone.getByLabel("CMJ trial 1 (cm)").fill("34");
  await pc.getByRole("button", { name: "Today", exact: true }).click();
  await pc.getByLabel("CMJ trial 1 (cm)").fill("35");
  await pc.getByRole("button", { name: "Save morning" }).click();
  await pc.getByRole("button", { name: "Settings", exact: true }).click();
  await pc.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect
    .poll(
      () =>
        [...docs.values()].find((d) => d.kind === "morning")?.payload.trials[0]
          .heightCm,
    )
    .toBe(35);
  await phone.bringToFront();
  await phone.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    phone.getByText(
      "This morning changed on another device. Your draft is retained.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(phone.getByLabel("CMJ trial 1 (cm)")).toHaveValue("34");
  offlineContexts.add(c2);
  await c2.setOffline(true);
  await phone
    .getByRole("button", {
      name: "Keep draft after reviewing incoming morning",
    })
    .click();
  await phone.getByRole("button", { name: "Save morning" }).click();
  await pc.getByRole("button", { name: "Today", exact: true }).click();
  await pc.getByLabel("CMJ trial 1 (cm)").fill("36");
  await pc.getByRole("button", { name: "Save morning" }).click();
  await pc.getByRole("button", { name: "Settings", exact: true }).click();
  await pc.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect
    .poll(
      () =>
        [...docs.values()].find((d) => d.kind === "morning")?.payload.trials[0]
          .heightCm,
    )
    .toBe(36);
  offlineContexts.delete(c2);
  await c2.setOffline(false);
  await phone.getByRole("button", { name: "Settings", exact: true }).click();
  await phone.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(
    phone.getByRole("button", { name: "Keep cloud version" }),
  ).toBeVisible();
  await phone.getByRole("button", { name: "Keep cloud version" }).click();
  await phone.getByRole("button", { name: "Today", exact: true }).click();
  await expect(phone.getByLabel("CMJ trial 1 (cm)")).toHaveValue("36");
  await c1.close();
  await c2.close();
});
