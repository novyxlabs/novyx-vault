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

  // Non-destructive. Exercises Novyx SDK 3.x rollbackPreview against the
  // deployed tenant. Skips the destructive POST rollback on purpose — the
  // preview path shares trace-id/semantic parsing with the actual rollback,
  // so if preview returns a well-formed response the mutation path will too.
  // Unit tests cover the POST response shape.
  test("memory rollback preview works against deployed SDK", async ({ page }) => {
    await login(page);

    const runId = Date.now().toString(36);
    const marker = `[smoke-rollback-${runId}]`;
    const observation = `${marker} verifying rollback preview`;

    const target = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 1_500));

    let createdId: string | undefined;

    try {
      let res = await page.request.post("/api/memory", { data: { observation } });
      expect(res.ok(), await responseBody(res)).toBeTruthy();

      res = await page.request.get("/api/memory?limit=50");
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      const listed = (await res.json()) as { memories: Array<{ uuid: string; observation: string }> };
      const created = listed.memories.find((m) => m.observation.includes(marker));
      expect(created, "created memory should appear in list").toBeTruthy();
      createdId = created?.uuid;

      res = await page.request.get(`/api/memory/rollback?target=${encodeURIComponent(target)}`);
      expect(res.ok(), await responseBody(res)).toBeTruthy();
      const preview = await res.json();
      expect(preview.mode).toBe("preview");
      expect(preview.rollback_target).toBe(target);
    } finally {
      if (createdId) {
        await page.request
          .delete("/api/memory", { data: { id: createdId } })
          .catch(() => undefined);
      }
    }
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
