import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SavePhonesToGistBody } from "@workspace/api-zod";

const router = Router();

const GIST_FILENAME = "wa_broadcast_phones.json";

function getUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): string {
  return req.isAuthenticated() ? req.user.id : "default";
}

async function getSettings(userId: string) {
  const [s] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId)).limit(1);
  return s ?? null;
}

type Contact = { number: string; name?: string | null };

function normalizePhones(phones: unknown[]): Contact[] {
  return phones.map((p) => {
    if (typeof p === "string") return { number: p, name: null };
    const c = p as { number?: string; name?: string | null };
    return { number: c.number ?? "", name: c.name ?? null };
  });
}

function normalizeGistData(raw: unknown): { lists: { name: string; phones: Contact[] }[] } {
  const data = raw as { lists?: unknown[] };
  if (!data?.lists || !Array.isArray(data.lists)) return { lists: [] };
  return {
    lists: data.lists.map((l: unknown) => {
      const list = l as { name?: string; phones?: unknown[] };
      return {
        name: list.name ?? "",
        phones: normalizePhones(Array.isArray(list.phones) ? list.phones : []),
      };
    }),
  };
}

router.get("/phones", async (req, res) => {
  const userId = getUserId(req);
  const settings = await getSettings(userId);
  if (!settings?.githubToken) {
    return res.status(400).json({ error: "GitHub token not configured. Add it in Settings." });
  }

  if (!settings.gistId) {
    return res.json({ lists: [] });
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
      headers: {
        Authorization: `Bearer ${settings.githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Failed to load Gist. Check your GitHub token and Gist ID." });
    }

    const gist = await response.json() as {
      files: Record<string, { content: string }>;
    };

    const fileContent = gist.files[GIST_FILENAME]?.content;
    if (!fileContent) {
      return res.json({ lists: [] });
    }

    const raw = JSON.parse(fileContent);
    return res.json(normalizeGistData(raw));
  } catch {
    return res.status(500).json({ error: "Failed to parse Gist data." });
  }
});

router.post("/phones", async (req, res) => {
  const userId = getUserId(req);
  const parsed = SavePhonesToGistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const settings = await getSettings(userId);
  if (!settings?.githubToken) {
    return res.status(400).json({ error: "GitHub token not configured. Add it in Settings." });
  }

  const content = JSON.stringify(parsed.data, null, 2);
  const files = { [GIST_FILENAME]: { content } };

  try {
    if (settings.gistId) {
      const response = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${settings.githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const err = await response.json() as { message?: string };
        return res.status(400).json({ error: err.message ?? "Failed to update Gist." });
      }

      const gist = await response.json() as { id: string; html_url: string };
      return res.json({ success: true, gistId: gist.id, gistUrl: gist.html_url });
    } else {
      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          description: "WhatsApp Broadcast Phone Lists",
          public: false,
          files,
        }),
      });

      if (!response.ok) {
        const err = await response.json() as { message?: string };
        return res.status(400).json({ error: err.message ?? "Failed to create Gist." });
      }

      const gist = await response.json() as { id: string; html_url: string };

      if (settings) {
        await db.update(settingsTable)
          .set({ gistId: gist.id })
          .where(and(eq(settingsTable.id, settings.id), eq(settingsTable.userId, userId)));
      }

      return res.json({ success: true, gistId: gist.id, gistUrl: gist.html_url });
    }
  } catch {
    return res.status(500).json({ error: "Network error connecting to GitHub." });
  }
});

export default router;
