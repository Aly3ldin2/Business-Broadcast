import { Router } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTemplateBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const templates = await db
    .select()
    .from(templatesTable)
    .orderBy(templatesTable.createdAt);
  return res.json(templates.map(formatTemplate));
});

router.post("/", async (req, res) => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const [template] = await db
    .insert(templatesTable)
    .values(parsed.data)
    .returning();
  return res.status(201).json(formatTemplate(template));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(templatesTable).where(eq(templatesTable.id, id));
  return res.status(204).send();
});

function formatTemplate(t: typeof templatesTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    body: t.body,
    headerText: t.headerText,
    footerText: t.footerText,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  };
}

export default router;
