import { test, expect, type BrowserContext } from "@playwright/test";
const at = "2026-10-21T00:00:00.000Z";
function job(i: number, user: string) {
  return { id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, name: `${user} automation ${i}`, code: "console.log('demo')", description: null, runtime: "nodejs20", cronExpr: "*/5 * * * *", timezone: "UTC", timeoutSeconds: 30, enabled: true, tags: [], isTemplatePublished: false, cloneCount: 0, createdAt: at, updatedAt: at, nextRunAt: at, lastRunAt: null, publishedAt: null };
}
async function fixture(context: BrowserContext) {
  let user: string | null = "Alice";
  const removed = new Set<string>();
  await context.addCookies([{ name: "caas.session_token", value: "local-fixture-only", url: "http://127.0.0.1:3101" }]);
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url());
    let payload: unknown = {};
    if (path.pathname.endsWith("/auth/sign-out")) user = null;
    else if (path.pathname.endsWith("/auth/sign-in/email")) user = route.request().postDataJSON().email.startsWith("bob") ? "Bob" : "Alice";
    else if (path.pathname.endsWith("/session")) payload = { user: user ? { id: user, name: user, email: `${user.toLowerCase()}@example.invalid`, isAdmin: false, suspended: false, role: "user" } : null, session: user ? { id: user, userId: user, expiresAt: "2099-01-01" } : null };
    else if (path.pathname.endsWith("/csrf-token")) payload = { csrfToken: "fixture-token" };
    else if (path.pathname.endsWith("/runtimes")) payload = { items: [{ id: "nodejs20", label: "Node.js", version: "v22" }, { id: "python312", label: "Python", version: "3.12" }], message: null };
    else if (path.pathname.endsWith("/onboarding/status")) payload = { status: { completed: true, progressPercent: 100, steps: [], nextStep: null } };
    else if (path.pathname.endsWith("/dashboard/overview")) payload = { overview: { counts: { totalAutomations: 25 - removed.size, activeAutomations: 25 - removed.size, pausedAutomations: 0 }, automations: Array.from({ length: 12 }, (_, i) => job(i + 1, user ?? "none")).filter((item) => !removed.has(item.id)), needsAttention: [], reliability: { successRate: 100 }, kpi: null } };
    else if (path.pathname.endsWith("/automations")) {
      const start = path.searchParams.has("cursor") ? 21 : 1;
      payload = { items: Array.from({ length: start === 1 ? 20 : 5 }, (_, i) => job(start + i, user ?? "none")), nextCursor: start === 1 ? job(20, "").id : null };
    }
    else if (/\/automations\/[^/]+\/secrets$/.test(path.pathname)) payload = { items: [] };
    else if (/\/automations\/[^/]+$/.test(path.pathname)) {
      const id = path.pathname.split("/").at(-1)!;
      if (route.request().method() === "DELETE") { removed.add(id); await route.fulfill({ status: 204, body: "" }); return; }
      payload = { automation: job(Number(id.slice(-12)), user ?? "none") };
    }
    await route.fulfill({ json: payload });
  });
}
test.beforeEach(async ({ context }) => fixture(context));
test("keeps an explicit timezone choice and offers an available Node runtime", async ({ page }) => {
  await page.goto("/automations/new");
  await page.getByRole("combobox", { name: "Timezone", exact: true }).click();
  await page.getByRole("option", { name: "UTC", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Timezone", exact: true })).toHaveText("UTC");
  await page.getByRole("combobox", { name: "Runtime", exact: true }).click();
  await page.getByRole("option", { name: "Node.js", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Runtime", exact: true })).toHaveText("Node.js");
  await expect(page.getByRole("combobox", { name: "Timezone", exact: true })).toHaveText("UTC");
});
test("navigates beyond the dashboard's twelve-item preview", async ({ page }) => {
  await page.goto("/automations");
  await expect(page.getByRole("link", { name: "Alice automation 20", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("link", { name: "Alice automation 25", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("link", { name: "Alice automation 1", exact: true })).toBeVisible();
});
test("does not reuse the previous account's private query data after client navigation", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Alice automation 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email", { exact: true }).fill("bob@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("link", { name: "Bob automation 1", exact: true })).toBeVisible();
  await expect(page.getByText("Alice automation 1", { exact: true })).toHaveCount(0);
});
test("refreshes the workspace after a direct detail-page deletion", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Alice automation 1", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Alice automation 1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Alice automation 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Alice automation 2", exact: true })).toBeVisible();
});
test("resets private editor state when another tab changes accounts", async ({ page, context }) => {
  await page.goto(`/automations/${job(1, "").id}`);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Alice automation 1");
  const other = await context.newPage(); await other.goto("/login");
  await other.getByLabel("Email", { exact: true }).fill("bob@example.invalid");
  await other.getByLabel("Password", { exact: true }).fill("fixture-password-123");
  await other.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Bob automation 1");
});
