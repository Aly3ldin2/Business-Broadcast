import { useState } from "react";
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
import { Loader2, Eye, EyeOff, MessageCircle, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@workspace/api-client-react";

const queryClient = new QueryClient();

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

async function fetchUser(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/api/auth/user`, { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

function useAuth() {
  return useQuery({ queryKey: ["auth-user"], queryFn: fetchUser, staleTime: Infinity });
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
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
        className="pr-3 pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #075e54 0%, #128c7e 40%, #25d366 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)", transform: "translate(-30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
      />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <MessageCircle className="h-10 w-10 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">WhatsApp Broadcast</h1>
            <p className="text-white/60 mt-1 text-sm">
              أدخل بياناتك للدخول إلى لوحة التحكم
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 space-y-5 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/80 text-sm font-medium">
                اسم المستخدم
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  dir="ltr"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  disabled={loading}
                  className="pr-3 pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/80 text-sm font-medium">
                كلمة المرور
              </Label>
              <div className="relative">
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  disabled={loading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || !username.trim() || !password
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.95)",
                color: loading || !username.trim() || !password ? "rgba(255,255,255,0.5)" : "#075e54",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-white/60 hover:text-white transition-colors hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/40 text-xs">
          أول مرة تدخل بياناتك سيتم إنشاء حسابك تلقائياً
        </p>
      </div>
    </div>
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
        body: JSON.stringify({
          username: username.trim(),
          gistToken: gistToken.trim(),
          newPassword,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || data.error) {
        toast({ title: "خطأ", description: data.error ?? "فشل إعادة تعيين كلمة المرور", variant: "destructive" });
        return;
      }

      toast({ title: "✅ تم", description: "تم إعادة تعيين كلمة المرور وتسجيل دخولك" });
      onSuccess();
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #075e54 0%, #128c7e 40%, #25d366 100%)",
      }}
    >
      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">استرداد كلمة المرور</h1>
            <p className="text-white/60 mt-1 text-sm">
              أدخل اسم المستخدم و GitHub Token لإعادة التعيين
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl p-7 space-y-4 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-username" className="text-white/80 text-sm">اسم المستخدم</Label>
              <Input
                id="fp-username"
                dir="ltr"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-gist-token" className="text-white/80 text-sm">GitHub Token</Label>
              <PasswordInput
                id="fp-gist-token"
                value={gistToken}
                onChange={setGistToken}
                placeholder="ghp_xxxxxxxxxxxx"
                disabled={loading}
                autoComplete="off"
              />
              <p className="text-xs text-white/40">نفس الـ Token المسجّل في صفحة الإعدادات</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-new-password" className="text-white/80 text-sm">كلمة المرور الجديدة</Label>
              <PasswordInput
                id="fp-new-password"
                value={newPassword}
                onChange={setNewPassword}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm-password" className="text-white/80 text-sm">تأكيد كلمة المرور</Label>
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
              className="w-full h-11 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "#075e54",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              إعادة تعيين كلمة المرور
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-white/50 hover:text-white transition-colors hover:underline"
            >
              ← العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    </div>
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #075e54 0%, #128c7e 40%, #25d366 100%)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <div className="text-white/60 text-sm">جارٍ التحقق من الهوية…</div>
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
      return (
        <ForgotPasswordForm
          onSuccess={handleSuccess}
          onBack={() => setShowForgot(false)}
        />
      );
    }

    return (
      <LoginForm
        onSuccess={handleSuccess}
        onForgotPassword={() => setShowForgot(true)}
      />
    );
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
