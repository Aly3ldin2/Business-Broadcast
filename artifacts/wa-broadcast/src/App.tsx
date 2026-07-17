import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Campaign from "@/pages/campaign";
import Lists from "@/pages/lists";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Lock, User, Moon, Sun, ShieldCheck, Globe } from "lucide-react";
import { BroadcastLogo } from "@/components/brand-logo";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import type { AuthUser } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";

const queryClient = new QueryClient();
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

// ---------------------------------------------------------------------------
// Auth queries
// ---------------------------------------------------------------------------
async function fetchUser(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/api/auth/user`, { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

async function fetchSetupStatus(): Promise<{ hasUser: boolean }> {
  const res = await fetch(`${BASE}/api/auth/setup-status`);
  if (!res.ok) return { hasUser: true };
  return res.json() as Promise<{ hasUser: boolean }>;
}

function useAuth() {
  return useQuery({ queryKey: ["auth-user"], queryFn: fetchUser, staleTime: Infinity });
}

function useSetupStatus() {
  return useQuery({ queryKey: ["setup-status"], queryFn: fetchSetupStatus, staleTime: Infinity });
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------
function PasswordInput({
  id, value, onChange, placeholder, disabled, autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        disabled={disabled}
        className="h-11 pl-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth shell — centered card with glowing logo hero
// ---------------------------------------------------------------------------
function AuthShell({
  children, title, subtitle, badge,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const { isDark, toggle } = useTheme();
  const { t, lang, setLang, dir } = useI18n();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background" dir={dir}>

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none select-none" aria-hidden>
        {/* Top-left orb */}
        <div
          className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(18,140,126,0.18) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(37,211,102,0.22) 0%, transparent 65%)",
          }}
        />
        {/* Bottom-right orb */}
        <div
          className="absolute -bottom-32 -right-32 w-[440px] h-[440px] rounded-full"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(7,94,84,0.22) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(7,94,84,0.12) 0%, transparent 65%)",
          }}
        />
        {/* Center subtle wash */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(18,140,126,0.06) 0%, transparent 100%)"
              : "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(37,211,102,0.07) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Top controls bar (always LTR so buttons stay at corners) ── */}
      <div className="relative z-20 flex items-center justify-end gap-2 px-4 sm:px-8 pt-4 pb-2" dir="ltr">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 backdrop-blur-sm transition-colors border border-border/60"
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          {t("lang_switch")}
        </button>
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 backdrop-blur-sm transition-colors border border-border/60"
        >
          {isDark
            ? <><Sun  className="h-3.5 w-3.5 shrink-0" />{t("nav_light_mode")}</>
            : <><Moon className="h-3.5 w-3.5 shrink-0" />{t("nav_dark_mode")}</>
          }
        </button>
      </div>

      {/* ── Main centered content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">

        {/* ── Brand hero ── */}
        <div className="flex flex-col items-center text-center mb-8 space-y-4">

          {/* Logo with layered glow */}
          <div className="relative flex items-center justify-center">
            {/* Outer soft ring */}
            <div
              className="absolute rounded-[36px] opacity-30 blur-2xl"
              style={{
                width: 140, height: 140,
                background: "linear-gradient(135deg, #075e54 0%, #25d366 100%)",
              }}
            />
            {/* Inner tighter glow */}
            <div
              className="absolute rounded-[28px] opacity-50 blur-md"
              style={{
                width: 108, height: 108,
                background: "linear-gradient(135deg, #075e54 0%, #25d366 100%)",
              }}
            />
            {/* Logo itself */}
            <BroadcastLogo
              size={92}
              className="relative rounded-[24px] shadow-2xl shadow-primary/40 splash-breathe"
            />
          </div>

          {/* App name */}
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent"
              style={{
                backgroundImage: isDark
                  ? "linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)"
                  : "linear-gradient(135deg, #065f46 0%, #059669 60%, #10b981 100%)",
              }}
            >
              {APP_NAME}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xs leading-relaxed">
              {t("auth_hero_subtitle")}
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {([t("auth_bulk_send"), t("auth_contact_lists"), t("auth_media_support")] as string[]).map((f) => (
              <span key={f}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                           bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="w-full max-w-sm">
          <div className="bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl shadow-2xl shadow-black/10 p-6 sm:p-8">

            {/* Card header */}
            <div className="space-y-1 mb-5">
              {badge && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-2">
                  <ShieldCheck className="h-3 w-3" />
                  {badge}
                </span>
              )}
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup Form — first-run only
// ---------------------------------------------------------------------------
function SetupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { t } = useI18n();
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [loading,  setLoading]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || !confirm) return;
    if (password !== confirm) {
      toast({ title: t("error"), description: t("auth_passwords_mismatch"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("error"), description: t("auth_password_short"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/setup`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { user?: AuthUser; error?: string };
      if (!res.ok || data.error) {
        toast({ title: t("error"), description: data.error ?? t("auth_fail_create"), variant: "destructive" });
        return;
      }
      toast({ title: t("auth_account_created"), description: t("auth_welcome") });
      await qc.invalidateQueries({ queryKey: ["setup-status"] });
      onSuccess();
    } catch {
      toast({ title: t("auth_connection_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth_setup_title")} subtitle={t("auth_setup_subtitle")} badge={t("auth_setup_badge")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{t("auth_setup_info")}</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-username" className="text-sm font-medium">{t("auth_username")}</Label>
          <div className="relative">
            <Input id="su-username" dir="ltr" autoComplete="username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" disabled={loading} className="h-11 pl-10" />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-password" className="text-sm font-medium">{t("auth_password")}</Label>
          <PasswordInput id="su-password" value={password} onChange={setPassword}
            disabled={loading} autoComplete="new-password" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-confirm" className="text-sm font-medium">{t("auth_confirm_password")}</Label>
          <PasswordInput id="su-confirm" value={confirm} onChange={setConfirm}
            disabled={loading} autoComplete="new-password" />
        </div>

        <button type="submit"
          disabled={loading || !username.trim() || !password || !confirm}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t("auth_creating") : t("auth_create_account_btn")}
        </button>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Login Form
// ---------------------------------------------------------------------------
function LoginForm({ onSuccess, onForgotPassword }: { onSuccess: () => void; onForgotPassword: () => void }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/login`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { user?: AuthUser; error?: string };
      if (!res.ok || data.error) {
        toast({ title: t("auth_error"), description: data.error ?? t("auth_wrong_credentials"), variant: "destructive" });
        return;
      }
      onSuccess();
    } catch {
      toast({ title: t("auth_connection_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth_login_title")} subtitle={t("auth_login_subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-sm font-medium">{t("auth_username")}</Label>
          <div className="relative">
            <Input id="username" dir="ltr" autoComplete="username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" disabled={loading} className="h-11 pl-10" />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">{t("auth_password")}</Label>
          <div className="relative">
            <PasswordInput id="password" autoComplete="current-password"
              value={password} onChange={setPassword} disabled={loading} />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <button type="submit"
          disabled={loading || !username.trim() || !password}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t("auth_signing_in") : t("auth_login_btn")}
        </button>

        <div className="text-center pt-1">
          <button type="button" onClick={onForgotPassword} className="text-sm text-primary hover:underline">
            {t("auth_forgot_password")}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Forgot Password Form
// ---------------------------------------------------------------------------
function ForgotPasswordForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [username,         setUsername]         = useState("");
  const [gistToken,        setGistToken]        = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [loading,          setLoading]          = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !gistToken.trim() || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: t("error"), description: t("auth_passwords_mismatch"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("error"), description: t("auth_password_short"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), gistToken: gistToken.trim(), newPassword }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast({ title: t("error"), description: data.error ?? t("auth_reset_fail"), variant: "destructive" });
        return;
      }
      toast({ title: t("auth_reset_done"), description: t("auth_reset_success") });
      onSuccess();
    } catch {
      toast({ title: t("auth_connection_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth_forgot_title")} subtitle={t("auth_forgot_subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fp-username" className="text-sm font-medium">{t("auth_username")}</Label>
          <Input id="fp-username" dir="ltr" autoComplete="username"
            value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="admin" disabled={loading} className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-gist-token" className="text-sm font-medium">{t("auth_github_token")}</Label>
          <PasswordInput id="fp-gist-token" value={gistToken} onChange={setGistToken}
            placeholder="ghp_xxxxxxxxxxxx" disabled={loading} autoComplete="off" />
          <p className="text-xs text-muted-foreground">{t("auth_github_token_hint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-new-password" className="text-sm font-medium">{t("auth_new_password")}</Label>
          <PasswordInput id="fp-new-password" value={newPassword} onChange={setNewPassword}
            disabled={loading} autoComplete="new-password" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-confirm-password" className="text-sm font-medium">{t("auth_confirm_password")}</Label>
          <PasswordInput id="fp-confirm-password" value={confirmPassword} onChange={setConfirmPassword}
            disabled={loading} autoComplete="new-password" />
        </div>

        <button type="submit"
          disabled={loading || !username.trim() || !gistToken.trim() || !newPassword || !confirmPassword}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth_reset_btn")}
        </button>

        <div className="text-center">
          <button type="button" onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">
            {t("auth_back_to_login")}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/"        component={Campaign}  />
        <Route path="/lists"   component={Lists}     />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Splash screen — shown during the initial auth/setup check
// ---------------------------------------------------------------------------
function SplashScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        {/* Icon with a subtle breathing animation */}
        <BroadcastLogo
          size={76}
          className="rounded-[22px] shadow-2xl shadow-primary/25 splash-breathe"
        />

        {/* App name — read from the central app-config constant */}
        <div className="text-center space-y-2.5">
          <p className="text-base font-bold text-foreground tracking-tight select-none">
            {APP_NAME}
          </p>
          {/* Loading indicator: three bouncing dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]"   />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login gate — guards the app behind auth
// ---------------------------------------------------------------------------
function LoginGate({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading,  data: user }        = useAuth();
  const { isLoading: setupLoading, data: setupStatus } = useSetupStatus();
  const qc = useQueryClient();
  const [, navigate]   = useLocation();
  const [showForgot, setShowForgot] = useState(false);

  if (authLoading || setupLoading) return <SplashScreen />;

  if (user) return <>{children}</>;

  const handleSuccess = () => {
    setShowForgot(false);
    navigate("/");
    void qc.invalidateQueries({ queryKey: ["auth-user"] });
    void qc.invalidateQueries({ queryKey: ["setup-status"] });
  };

  if (!setupStatus?.hasUser) return <SetupForm onSuccess={handleSuccess} />;

  if (showForgot) {
    return <ForgotPasswordForm onSuccess={handleSuccess} onBack={() => setShowForgot(false)} />;
  }

  return <LoginForm onSuccess={handleSuccess} onForgotPassword={() => setShowForgot(true)} />;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LoginGate>
            <AppRouter />
          </LoginGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
