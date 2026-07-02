import { Router, type IRouter, type Request, type Response } from "express";
import {
  checkCredentials,
  changeCredentials,
  createFirstUser,
  hasAnyUser,
  requestPasswordReset,
  verifyAndConsumeResetToken,
  createSession,
  clearSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// Returns whether the app has been set up (first user created)
router.get("/auth/setup-status", async (_req: Request, res: Response) => {
  const ready = await hasAnyUser();
  res.json({ hasUser: ready });
});

// First-run setup — creates the initial user; rejected once a user exists
router.post("/auth/setup", async (req: Request, res: Response) => {
  const { username, password, email } = req.body as {
    username?: string;
    password?: string;
    email?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    return;
  }

  const result = await createFirstUser(username.trim(), password, email?.trim());
  if (!result.success || !result.user) {
    res.status(400).json({ error: result.error ?? "فشل إنشاء الحساب" });
    return;
  }

  const sid = await createSession({ user: result.user });
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });

  res.json({ user: result.user });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    return;
  }

  const result = await checkCredentials(username.trim(), password);

  if (result.status === "not_found" || result.status === "invalid") {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }

  const sid = await createSession({ user: result.user });
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });

  res.json({ user: result.user });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

router.post("/auth/change-credentials", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "غير مسموح" });
    return;
  }

  const { newUsername, newPassword } = req.body as { newUsername?: string; newPassword?: string };
  if (!newUsername || !newPassword) {
    res.status(400).json({ error: "اسم المستخدم وكلمة المرور الجديدة مطلوبان" });
    return;
  }

  const result = await changeCredentials(req.user.id, newUsername.trim(), newPassword);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const sid = getSessionId(req);
  await clearSession(res, sid);

  res.json({ success: true, message: "تم تغيير بيانات الدخول. سجّل دخولك مجدداً." });
});

// Step 1 of password reset — send OTP to email
router.post("/auth/request-reset", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    return;
  }

  const result = await requestPasswordReset(email.trim());

  if (!result.success) {
    res.status(500).json({ error: result.error ?? "فشل إرسال البريد" });
    return;
  }

  // Always return success to avoid revealing whether the email is registered
  res.json({ success: true });
});

// Step 2 of password reset — verify OTP and set new password
router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token?.trim() || !newPassword) {
    res.status(400).json({ error: "الكود وكلمة المرور الجديدة مطلوبان" });
    return;
  }

  const result = await verifyAndConsumeResetToken(token.trim(), newPassword);

  if (!result.success || !result.user) {
    res.status(400).json({ error: result.error ?? "فشل إعادة تعيين كلمة المرور" });
    return;
  }

  const sid = await createSession({ user: result.user });
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });

  res.json({ success: true, user: result.user });
});

export default router;
