import crypto from "crypto";
import bcrypt from "bcryptjs";
import { type Request, type Response } from "express";
import { db, sessionsTable, appUsersTable, settingsTable, passwordResetTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";
import { sendPasswordResetEmail } from "./mailer";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  user: AuthUser;
}

export type LoginResult =
  | { status: "ok"; user: AuthUser }
  | { status: "not_found" }
  | { status: "invalid" };

// ---------------------------------------------------------------------------
// Check if any user exists in the DB (first-run detection)
// ---------------------------------------------------------------------------
export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ id: appUsersTable.id }).from(appUsersTable).limit(1);
  return !!row;
}

// ---------------------------------------------------------------------------
// Create the very first user — only allowed when no user exists
// ---------------------------------------------------------------------------
export async function createFirstUser(
  username: string,
  password: string,
  email?: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const already = await hasAnyUser();
  if (already) {
    return { success: false, error: "الحساب موجود بالفعل — سجّل دخولك" };
  }
  if (password.length < 6) {
    return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email?.toLowerCase().trim() || undefined;
  const [row] = await db
    .insert(appUsersTable)
    .values({ username, passwordHash, ...(normalizedEmail ? { email: normalizedEmail } : {}) })
    .returning();
  return {
    success: true,
    user: {
      id: row.id,
      email: row.email ?? null,
      firstName: row.username,
      lastName: null,
      profileImageUrl: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Normal login — never auto-creates
// ---------------------------------------------------------------------------
export async function checkCredentials(username: string, password: string): Promise<LoginResult> {
  const [existing] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.username, username))
    .limit(1);

  if (!existing) return { status: "not_found" };

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
// Email-based password reset
// ---------------------------------------------------------------------------

/** Step 1: request a reset OTP — sent to the user's registered email */
export async function requestPasswordReset(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const normalized = email.toLowerCase().trim();
  const [appUser] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.email, normalized))
    .limit(1);

  // Don't reveal whether the email exists
  if (!appUser) return { success: true };

  // Invalidate any previous tokens for this user
  await db
    .delete(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.userId, appUser.id));

  // Generate a 6-digit OTP using a cryptographically secure source
  const token = crypto.randomInt(100000, 999999).toString();

  await db.insert(passwordResetTokensTable).values({
    userId: appUser.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return sendPasswordResetEmail(normalized, token);
}

/** Step 2: verify the OTP and set a new password */
export async function verifyAndConsumeResetToken(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const [resetRow] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token.trim()))
    .limit(1);

  if (!resetRow) return { success: false, error: "الكود غير صحيح" };
  if (resetRow.expiresAt < new Date())
    return { success: false, error: "انتهت صلاحية الكود — اطلب كوداً جديداً" };
  if (resetRow.usedAt)
    return { success: false, error: "تم استخدام هذا الكود مسبقاً" };
  if (newPassword.length < 6)
    return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, resetRow.id));

  const [appUser] = await db
    .update(appUsersTable)
    .set({ passwordHash })
    .where(eq(appUsersTable.id, resetRow.userId))
    .returning();

  return {
    success: true,
    user: {
      id: appUser.id,
      email: appUser.email ?? null,
      firstName: appUser.username,
      lastName: null,
      profileImageUrl: null,
    },
  };
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
