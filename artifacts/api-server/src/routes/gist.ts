import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SavePhonesToGistBody } from "@workspace/api-zod";

const router = Router();

const GIST_FILENAME = "wa_broadcast_phones.json";

async function getSettings() {
  const [s] = await db.select().from(settingsTable).limit(1);
  return s ?? null;
}

router.get("/phones", async (_req, res) => {
  const settings = await getSettings();
  if (!settings?.githubToken) {
    return res.status(400).json({ error: "GitHub token not configured. Add it in Settings." });
  }

  // If no gist yet, return empty
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

    const data = JSON.parse(fileContent);
    return res.json(data);
  } catch {
    return res.status(500).json({ error: "Failed to parse Gist data." });
  }
});

router.post("/phones", async (req, res) => {
  const parsed = SavePhonesToGistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const settings = await getSettings();
  if (!settings?.githubToken) {
    return res.status(400).json({ error: "GitHub token not configured. Add it in Settings." });
  }

  const content = JSON.stringify(parsed.data, null, 2);
  const files = { [GIST_FILENAME]: { content } };

  try {
    if (settings.gistId) {
      // Update existing gist
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
      // Create new gist
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

      // Save the new gist ID to settings
      if (settings) {
        await db.update(settingsTable).set({ gistId: gist.id }).where(eq(settingsTable.id, settings.id));
      }

      return res.json({ success: true, gistId: gist.id, gistUrl: gist.html_url });
    }
  } catch {
    return res.status(500).json({ error: "Network error contacting GitHub." });
  }
});

export default router;
