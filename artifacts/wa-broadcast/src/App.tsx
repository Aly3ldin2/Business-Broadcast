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
import { Loader2 } from "lucide-react";
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

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
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
      const data = (await res.json()) as { user?: AuthUser; firstLogin?: boolean; message?: string; error?: string };

      if (res.status === 201 && data.firstLogin) {
        toast({ title: "✅ تم إنشاء الحساب!", description: "سجّل دخولك مرة أخرى بنفس البيانات للتأكيد." });
        setPassword("");
        return;
      }

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
          <Input
            id="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
      </form>
    </div>
  );
}

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">جارٍ التحقق من الهوية…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onSuccess={() => void qc.invalidateQueries({ queryKey: ["auth-user"] })} />;
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
