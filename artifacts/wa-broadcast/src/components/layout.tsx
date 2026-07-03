import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Send, Settings, Users, Menu, Radio, Moon, Sun, LogOut, Globe, Linkedin, Github, MessageCircle, Facebook } from "lucide-react";
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

function ContactFooter() {
  const { dir } = useI18n();
  const links = [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/ali-sayed-soliman",
      icon: Linkedin,
      color: "hover:text-[#0077B5]",
    },
    {
      label: "GitHub",
      href: "https://github.com/Aly3ldin",
      icon: Github,
      color: "hover:text-foreground",
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/201068716030",
      icon: MessageCircle,
      color: "hover:text-[#25D366]",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/share/18kKGZAe1a/",
      icon: Facebook,
      color: "hover:text-[#1877F2]",
    },
  ];

  return (
    <footer className="mt-10 border-t pt-6 pb-4" dir={dir}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          تواصل معنا
        </p>
        <div className="flex items-center gap-4">
          {links.map(({ label, href, icon: Icon, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className={`flex items-center gap-1.5 text-muted-foreground transition-colors ${color} group`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs hidden sm:inline">{label}</span>
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/60">Ali Sayed Soliman</p>
      </div>
    </footer>
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
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
              {t(item.nameKey)}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background" dir="ltr">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b flex items-center px-4 gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-52 p-0">
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
        <div className="flex flex-1 flex-col overflow-hidden" dir={dir}>
          <main className="flex-1 overflow-y-auto p-4 pt-16 md:pt-6 md:p-8">
            <div className="mx-auto max-w-3xl">
              {children}
              <ContactFooter />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
