import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Send, Settings, Users, Menu, Radio, Moon, Sun, LogOut, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";

interface LayoutProps {
  children: ReactNode;
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

function useTheme() {
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

function SiteLogo() {
  return (
    <Link href="/">
      <div className="flex items-center gap-2 cursor-pointer select-none group">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
          WhatsApp<br />Broadcast
        </span>
      </div>
    </Link>
  );
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onToggle}
      title={isDark ? t("nav_light_mode") : t("nav_dark_mode")}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {isDark ? t("nav_light_mode") : t("nav_dark_mode")}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      title={t("lang_switch")}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
    >
      <Globe className="h-4 w-4 shrink-0" />
      {t("lang_switch")}
    </button>
  );
}

function LogoutButton() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
      await qc.invalidateQueries({ queryKey: ["auth-user"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handleLogout()}
      disabled={loading}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {t("nav_logout")}
    </button>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { isDark, toggle } = useTheme();
  const { t, dir } = useI18n();

  const navigation = [
    { nameKey: "nav_home", href: "/", icon: Send },
    { nameKey: "nav_lists", href: "/lists", icon: Users },
    { nameKey: "nav_settings", href: "/settings", icon: Settings },
  ];

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-0.5 py-3 px-2">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.nameKey} href={item.href}>
            <div
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className={`${dir === "rtl" ? "ml-3" : "mr-3"} h-4 w-4 shrink-0`} />
              {t(item.nameKey)}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b flex items-center px-4 gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-52 p-0">
              <div className="flex h-14 shrink-0 items-center px-4 border-b">
                <SiteLogo />
              </div>
              <NavLinks />
              <div className="p-2 border-t space-y-1">
                <LangToggle />
                <ThemeToggle isDark={isDark} onToggle={toggle} />
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
          <SiteLogo />
          <div className="flex-1" />
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-48 md:flex-col border-r bg-background">
          <div className="flex h-14 shrink-0 items-center px-4 border-b">
            <SiteLogo />
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks />
          </div>
          <div className="p-2 border-t space-y-1">
            <LangToggle />
            <ThemeToggle isDark={isDark} onToggle={toggle} />
            <LogoutButton />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 pt-16 md:pt-6 md:p-8">
            <div className="mx-auto max-w-3xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
