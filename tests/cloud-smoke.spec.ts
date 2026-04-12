import { expect, test, type APIResponse, type Page } from "@playwright/test";

const requiredEnv = [
  "CLOUD_SMOKE_BASE_URL",
  "CLOUD_SMOKE_EMAIL",
  "CLOUD_SMOKE_PASSWORD",
] as const;

const hasCloudSmokeEnv = requiredEnv.every((key) => Boolean(process.env[key]));

test.describe("Cloud smoke", () => {
  test.skip(
    !hasCloudSmokeEnv,
    `Set ${requiredEnv.join(", ")} to run deployed cloud smoke tests`
  );

  test("public pages respond", async ({ page, request }) => {
    for (const path of ["/", "/features", "/pricing", "/faq", "/robots.txt", "/sitemap.xml"]) {
      const res = await request.get(path);
      expect(res.status(), `${path} status`).toBeLessThan(500);
    }

    await page.goto("/");
    await expect(page).toHaveTitle(/Novyx|Vault/i);
  });

  test("authenticated note lifecycle, publish, and cleanup work", async ({ page }) => {
    const id = Date.now().toString(36);
    const originalPath = `Smoke Tests/cloud-smoke-${id}`;
    const renamedPath = `${originalPath}-renamed`;
    const slug = `cloud-smoke-${id}`;
    const title = `Cloud Smoke ${id}`;
    const content = `# ${title}\n\nCreated by the deployed cloud smoke test.`;
    let activePath = originalPath;
    let isPublished = false;

    await login(page);

    try {
      let res = await page.request.post("/api/notes", {
        data: { path: originalPath, content },
      });
      expect(res.ok(), await responseBody(res)).toBeTruthy();

      res = await page.request.get(`/api/notes?path=${encodeURIComponent(originalPath)}`);
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      expect((await res.json()).content).toContain(title);

      res = await page.request.patch("/api/notes/move", {
        data: { oldPath: originalPath, newPath: renamedPath },
      });
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      activePath = renamedPath;

      res = await page.request.post("/api/notes/publish", {
        data: { path: renamedPath, publish: true, slug },
      });
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      const published = await res.json();
      expect(published.slug).toBe(slug);
      isPublished = true;

      res = await page.request.get(`/p/${encodeURIComponent(slug)}`);
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      expect(await res.text()).toContain(title);
    } finally {
      if (isPublished) {
        await page.request
          .post("/api/notes/publish", {
            data: { path: activePath, publish: false },
          })
          .catch(() => undefined);
      }

      await page.request
        .delete("/api/notes", { data: { path: activePath } })
        .catch(() => undefined);
      await page.request
        .delete("/api/notes", { data: { path: originalPath } })
        .catch(() => undefined);
      await purgeTrashEntry(page, activePath);
      await purgeTrashEntry(page, originalPath);
    }
  });

  test("authenticated notes API rejects traversal paths", async ({ page }) => {
    await login(page);

    const res = await page.request.post("/api/notes", {
      data: { path: "../escape", content: "bad" },
    });

    expect(res.status()).toBe(400);
  });
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(process.env.CLOUD_SMOKE_EMAIL ?? "");
  await page.getByPlaceholder("Password").fill(process.env.CLOUD_SMOKE_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function purgeTrashEntry(page: Page, originalPath: string) {
  const trash = await page.request.get("/api/notes/trash");
  if (!trash.ok()) return;

  const { entries } = (await trash.json()) as {
    entries?: Array<{ id: string; originalPath: string }>;
  };
  const entry = entries?.find((item) => item.originalPath === originalPath);
  if (!entry) return;

  await page.request
    .post("/api/notes/trash", { data: { action: "purge", id: entry.id } })
    .catch(() => undefined);
}

async function responseBody(res: APIResponse) {
  return `${res.status()} ${await res.text().catch(() => "")}`;
}
