import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
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
import {
  Loader2, Eye, EyeOff, MessageCircle,
  Lock, User, Moon, Sun, Radio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@workspace/api-client-react";

const queryClient = new QueryClient();
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

// ---------------------------------------------------------------------------
// Theme hook — shared by login page and layout
// ---------------------------------------------------------------------------
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("wa_theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("wa_theme", isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function fetchUser(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/api/auth/user`, { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

function useAuth() {
  return useQuery({ queryKey: ["auth-user"], queryFn: fetchUser, staleTime: Infinity });
}

// ---------------------------------------------------------------------------
// Password Input
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
// Login Page shell — handles theme + split layout
// ---------------------------------------------------------------------------
function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">

      {/* ── Left panel — decorative (desktop only) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0a1f1c 0%, #0d2b25 50%, #0f3d2e 100%)"
            : "linear-gradient(135deg, #075e54 0%, #128c7e 50%, #25d366 100%)",
        }}
      >
        {/* decorative circles */}
        <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 60%)" }} />

        <div className="relative z-10 text-center space-y-8 max-w-md">
          {/* Logo */}
          <div className="flex justify-center">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Radio className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              WhatsApp<br />Broadcast
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              أرسل رسائل جماعية لعملائك بكل سهولة وسرعة عبر WhatsApp
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {["إرسال جماعي", "قوائم جهات الاتصال", "دعم الوسائط"].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-sm text-white/80 font-medium"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-5">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-sm font-bold text-foreground">WhatsApp Broadcast</span>
          </div>
          <div className="hidden lg:block" />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
            title={isDark ? "الوضع الفاتح" : "الوضع المظلم"}
          >
            {isDark
              ? <><Sun className="h-3.5 w-3.5" /><span className="hidden sm:inline">فاتح</span></>
              : <><Moon className="h-3.5 w-3.5" /><span className="hidden sm:inline">مظلم</span></>
            }
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-sm space-y-6">

            {/* Mobile header */}
            <div className="lg:hidden text-center space-y-1 mb-2">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block space-y-1">
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-5 px-4">
          أول مرة تدخل بياناتك سيتم إنشاء حسابك تلقائياً
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login Form
// ---------------------------------------------------------------------------
function LoginForm({
  onSuccess,
  onForgotPassword,
}: {
  onSuccess: () => void;
  onForgotPassword: () => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { user?: AuthUser; error?: string };
      if (!res.ok || data.error) {
        toast({ title: "خطأ", description: data.error ?? "فشل تسجيل الدخول", variant: "destructive" });
        return;
      }
      onSuccess();
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="تسجيل الدخول" subtitle="أدخل بياناتك للوصول إلى لوحة التحكم">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-sm font-medium">اسم المستخدم</Label>
          <div className="relative">
            <Input
              id="username"
              dir="ltr"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              disabled={loading}
              className="h-11 pl-10"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
          <div className="relative">
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              disabled={loading}
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-primary hover:underline"
          >
            نسيت كلمة المرور؟
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Forgot Password Form
// ---------------------------------------------------------------------------
function ForgotPasswordForm({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [gistToken, setGistToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !gistToken.trim() || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), gistToken: gistToken.trim(), newPassword }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast({ title: "خطأ", description: data.error ?? "فشل إعادة تعيين كلمة المرور", variant: "destructive" });
        return;
      }
      toast({ title: "✅ تم", description: "تم إعادة تعيين كلمة المرور بنجاح" });
      onSuccess();
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="استرداد كلمة المرور" subtitle="أدخل بياناتك لإعادة تعيين كلمة المرور">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fp-username" className="text-sm font-medium">اسم المستخدم</Label>
          <Input
            id="fp-username"
            dir="ltr"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            disabled={loading}
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-gist-token" className="text-sm font-medium">GitHub Token</Label>
          <PasswordInput
            id="fp-gist-token"
            value={gistToken}
            onChange={setGistToken}
            placeholder="ghp_xxxxxxxxxxxx"
            disabled={loading}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">نفس الـ Token المسجّل في صفحة الإعدادات</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-new-password" className="text-sm font-medium">كلمة المرور الجديدة</Label>
          <PasswordInput
            id="fp-new-password"
            value={newPassword}
            onChange={setNewPassword}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-confirm-password" className="text-sm font-medium">تأكيد كلمة المرور</Label>
          <PasswordInput
            id="fp-confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim() || !gistToken.trim() || !newPassword || !confirmPassword}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          إعادة تعيين كلمة المرور
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
          >
            ← العودة لتسجيل الدخول
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Router & App shell
// ---------------------------------------------------------------------------
function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Campaign} />
        <Route path="/lists" component={Lists} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isLoading, data: user } = useAuth();
  const qc = useQueryClient();
  const [showForgot, setShowForgot] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">جارٍ التحقق من الهوية…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSuccess = () => {
      setShowForgot(false);
      void qc.invalidateQueries({ queryKey: ["auth-user"] });
    };

    if (showForgot) {
      return <ForgotPasswordForm onSuccess={handleSuccess} onBack={() => setShowForgot(false)} />;
    }
    return <LoginForm onSuccess={handleSuccess} onForgotPassword={() => setShowForgot(true)} />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LoginGate>
            <Router />
          </LoginGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
