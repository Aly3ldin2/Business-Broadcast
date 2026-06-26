import crypto from "crypto";
import bcrypt from "bcryptjs";
import { type Request, type Response } from "express";
import { db, sessionsTable, appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  user: AuthUser;
}

export type LoginResult =
  | { status: "ok"; user: AuthUser }
  | { status: "first_login_registered" }
  | { status: "invalid" };

export async function checkCredentials(username: string, password: string): Promise<LoginResult> {
  const [existing] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.username, username))
    .limit(1);

  if (!existing) {
    // First time this username is used — create the account and ask user to re-login
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(appUsersTable).values({ username, passwordHash });
    return { status: "first_login_registered" };
  }

  const valid = await bcrypt.compare(password, existing.passwordHash);
  if (!valid) return { status: "invalid" };

  return {
    status: "ok",
    user: {
      id: existing.id,
      email: null,
      firstName: existing.username,
      lastName: null,
      profileImageUrl: null,
    },
  };
}

export async function changeCredentials(
  userId: string,
  newUsername: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const [existing] = await db.select().from(appUsersTable).where(eq(appUsersTable.id, userId)).limit(1);
  if (!existing) return { success: false, error: "المستخدم غير موجود" };

  // Check if new username is taken by another user
  if (newUsername !== existing.username) {
    const [taken] = await db.select().from(appUsersTable).where(eq(appUsersTable.username, newUsername)).limit(1);
    if (taken) return { success: false, error: "اسم المستخدم مستخدم بالفعل" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(appUsersTable)
    .set({ username: newUsername, passwordHash })
    .where(eq(appUsersTable.id, userId));

  return { success: true };
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}
