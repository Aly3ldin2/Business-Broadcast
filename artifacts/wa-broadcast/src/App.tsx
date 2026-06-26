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
import { Loader2, Eye, EyeOff } from "lucide-react";
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
        className="pl-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-8" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-4xl">💬</div>
        <h1 className="text-2xl font-bold">WhatsApp Broadcast</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          أدخل اسم المستخدم وكلمة المرور للدخول. أول مرة تدخل بيانات هيتم إنشاء حسابك تلقائياً.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-card border rounded-xl p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="username">اسم المستخدم</Label>
          <Input
            id="username"
            dir="ltr"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">كلمة المرور</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          تسجيل الدخول
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-primary hover:underline"
          >
            نسيت كلمة المرور؟
          </button>
        </div>
      </form>
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-8" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-4xl">🔑</div>
        <h1 className="text-2xl font-bold">استرداد كلمة المرور</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          أدخل اسم المستخدم و GitHub Token المسجّل في حسابك لإعادة تعيين كلمة المرور.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-card border rounded-xl p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="fp-username">اسم المستخدم</Label>
          <Input
            id="fp-username"
            dir="ltr"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-gist-token">GitHub Token</Label>
          <PasswordInput
            id="fp-gist-token"
            value={gistToken}
            onChange={setGistToken}
            placeholder="ghp_xxxxxxxxxxxx"
            disabled={loading}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            نفس الـ Token المسجّل في صفحة الإعدادات
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-new-password">كلمة المرور الجديدة</Label>
          <PasswordInput
            id="fp-new-password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fp-confirm-password">تأكيد كلمة المرور</Label>
          <PasswordInput
            id="fp-confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim() || !gistToken.trim() || !newPassword || !confirmPassword}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          إعادة تعيين كلمة المرور
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            ← العودة لتسجيل الدخول
          </button>
        </div>
      </form>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">جارٍ التحقق من الهوية…</div>
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
