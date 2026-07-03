import { Router, type IRouter, type Request, type Response } from "express";
import {
  checkCredentials,
  changeCredentials,
  createFirstUser,
  hasAnyUser,
  resetPasswordWithGistToken,
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
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const result = await createFirstUser(username.trim(), password);
  if (!result.success || !result.user) {
    res.status(400).json({ error: result.error ?? "Failed to create account" });
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
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const result = await checkCredentials(username.trim(), password);

  if (result.status === "not_found" || result.status === "invalid") {
    res.status(401).json({ error: "Incorrect username or password" });
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
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { newUsername, newPassword } = req.body as { newUsername?: string; newPassword?: string };
  if (!newUsername || !newPassword) {
    res.status(400).json({ error: "New username and password are required" });
    return;
  }

  const result = await changeCredentials(req.user.id, newUsername.trim(), newPassword);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  const sid = getSessionId(req);
  await clearSession(res, sid);

  res.json({ success: true, message: "Credentials updated. Please sign in again." });
});

// Forgot password — verified via GitHub Gist token
router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { username, gistToken, newPassword } = req.body as {
    username?: string;
    gistToken?: string;
    newPassword?: string;
  };

  if (!username || !gistToken || !newPassword) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const result = await resetPasswordWithGistToken(username.trim(), gistToken.trim(), newPassword);

  if (!result.success || !result.user) {
    res.status(400).json({ error: result.error ?? "Failed to reset password" });
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
