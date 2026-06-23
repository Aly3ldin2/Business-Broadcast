import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Campaign from "@/pages/campaign";
import Lists from "@/pages/lists";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useAuth } from "@workspace/replit-auth-web";

const queryClient = new QueryClient();

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
  const { isLoading, isAuthenticated, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">جارٍ التحقق من الهوية…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">💬</div>
          <h1 className="text-2xl font-bold">WhatsApp Broadcast</h1>
          <p className="text-muted-foreground max-w-xs">
            سجّل دخولك باستخدام حساب Replit للمتابعة
          </p>
        </div>
        <button
          onClick={login}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors"
        >
          تسجيل الدخول
        </button>
      </div>
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
