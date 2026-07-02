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
  Lock, User, Moon, Sun, Radio, ShieldCheck, Mail, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@workspace/api-client-react";

const queryClient = new QueryClient();
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

// ---------------------------------------------------------------------------
// Theme hook
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
// Auth shell — split layout for desktop, single column for mobile
// ---------------------------------------------------------------------------
function AuthShell({
  children,
  title,
  subtitle,
  badge,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">

      {/* ── Left panel (desktop) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0a1f1c 0%, #0d2b25 50%, #0f3d2e 100%)"
            : "linear-gradient(135deg, #075e54 0%, #128c7e 50%, #25d366 100%)",
        }}
      >
        <div className="absolute top-[-10%] right-[-5%] w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />

        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="flex justify-center">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Radio className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">WhatsApp<br />Broadcast</h1>
            <p className="text-white/70 text-lg leading-relaxed">
              أرسل رسائل جماعية لعملائك بكل سهولة وسرعة عبر WhatsApp
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["إرسال جماعي", "قوائم جهات الاتصال", "دعم الوسائط"].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full text-sm text-white/80 font-medium"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-8 pt-5">
          <div className="flex lg:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-sm font-bold text-foreground">WhatsApp Broadcast</span>
          </div>
          <div className="hidden lg:block" />
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border"
          >
            {isDark
              ? <><Sun className="h-3.5 w-3.5" /><span className="hidden sm:inline">فاتح</span></>
              : <><Moon className="h-3.5 w-3.5" /><span className="hidden sm:inline">مظلم</span></>
            }
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1">
              {badge && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mb-2">
                  {badge}
                </span>
              )}
              <h2 className="text-2xl font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || !confirm) return;
    if (password !== confirm) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/setup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, email: email.trim() || undefined }),
      });
      const data = (await res.json()) as { user?: AuthUser; error?: string };
      if (!res.ok || data.error) {
        toast({ title: "خطأ", description: data.error ?? "فشل إنشاء الحساب", variant: "destructive" });
        return;
      }
      toast({ title: "✅ تم إنشاء الحساب", description: "مرحباً بك في WhatsApp Broadcast" });
      await qc.invalidateQueries({ queryKey: ["setup-status"] });
      onSuccess();
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="إنشاء حسابك"
      subtitle="المرة الأولى — اختر اسم المستخدم وكلمة المرور"
      badge="إعداد أولي"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info box */}
        <div className="flex gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>هذه البيانات ستُستخدم لتسجيل الدخول لاحقاً. احتفظ بها في مكان آمن.</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-username" className="text-sm font-medium">اسم المستخدم</Label>
          <div className="relative">
            <Input
              id="su-username"
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
          <Label htmlFor="su-email" className="text-sm font-medium">
            البريد الإلكتروني <span className="text-muted-foreground text-xs">(لاسترداد كلمة المرور)</span>
          </Label>
          <div className="relative">
            <Input
              id="su-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="h-11 pl-10"
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-password" className="text-sm font-medium">كلمة المرور</Label>
          <PasswordInput
            id="su-password"
            value={password}
            onChange={setPassword}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-confirm" className="text-sm font-medium">تأكيد كلمة المرور</Label>
          <PasswordInput
            id="su-confirm"
            value={confirm}
            onChange={setConfirm}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim() || !password || !confirm}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب والدخول"}
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
          <button type="button" onClick={onForgotPassword} className="text-sm text-primary hover:underline">
            نسيت كلمة المرور؟
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Forgot Password Form — 2-step email OTP flow
// ---------------------------------------------------------------------------
function ForgotPasswordForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast({ title: "خطأ", description: data.error ?? "فشل إرسال الكود", variant: "destructive" });
        return;
      }
      toast({ title: "📧 تم الإرسال", description: "تحقق من بريدك الإلكتروني وأدخل الكود المُرسل" });
      setStep("otp");
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim() || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
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

  if (step === "email") {
    return (
      <AuthShell title="استرداد كلمة المرور" subtitle="أدخل بريدك الإلكتروني لاستلام كود التحقق">
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-email" className="text-sm font-medium">البريد الإلكتروني</Label>
            <div className="relative">
              <Input
                id="fp-email"
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="h-11 pl-10"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "جارٍ الإرسال..." : "إرسال كود التحقق"}
          </button>

          <div className="text-center">
            <button type="button" onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-1 mx-auto">
              <ArrowLeft className="h-3 w-3" /> العودة لتسجيل الدخول
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="أدخل الكود الجديد" subtitle={`تم إرسال كود مكون من 6 أرقام إلى ${email}`}>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fp-token" className="text-sm font-medium">كود التحقق</Label>
          <Input
            id="fp-token"
            dir="ltr"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            disabled={loading}
            className="h-11 text-center text-xl tracking-widest font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-new-password" className="text-sm font-medium">كلمة المرور الجديدة</Label>
          <PasswordInput id="fp-new-password" value={newPassword} onChange={setNewPassword}
            disabled={loading} autoComplete="new-password" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-confirm-password" className="text-sm font-medium">تأكيد كلمة المرور</Label>
          <PasswordInput id="fp-confirm-password" value={confirmPassword} onChange={setConfirmPassword}
            disabled={loading} autoComplete="new-password" />
        </div>

        <button
          type="submit"
          disabled={loading || token.length !== 6 || !newPassword || !confirmPassword}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          تأكيد إعادة التعيين
        </button>

        <div className="text-center space-y-2">
          <button type="button" onClick={() => setStep("email")}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors block mx-auto">
            لم يصلك الكود؟ أعد الإرسال
          </button>
          <button type="button" onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors flex items-center gap-1 mx-auto">
            <ArrowLeft className="h-3 w-3" /> العودة لتسجيل الدخول
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
        <Route path="/" component={Campaign} />
        <Route path="/lists" component={Lists} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading, data: user } = useAuth();
  const { isLoading: setupLoading, data: setupStatus } = useSetupStatus();
  const qc = useQueryClient();
  const [showForgot, setShowForgot] = useState(false);

  const loading = authLoading || setupLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        </div>
      </div>
    );
  }

  if (user) return <>{children}</>;

  const handleSuccess = () => {
    setShowForgot(false);
    void qc.invalidateQueries({ queryKey: ["auth-user"] });
    void qc.invalidateQueries({ queryKey: ["setup-status"] });
  };

  // First-run: no user exists in DB yet
  if (!setupStatus?.hasUser) {
    return <SetupForm onSuccess={handleSuccess} />;
  }

  if (showForgot) {
    return <ForgotPasswordForm onSuccess={handleSuccess} onBack={() => setShowForgot(false)} />;
  }

  return <LoginForm onSuccess={handleSuccess} onForgotPassword={() => setShowForgot(true)} />;
}

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
