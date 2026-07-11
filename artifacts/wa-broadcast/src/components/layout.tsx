import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Send, Settings, Users, Menu, Moon, Sun, LogOut, Globe, Linkedin, Github, Facebook } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
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
        <img src="/icons/icon-512.png" alt="logo" className="w-7 h-7 rounded-md shrink-0" />
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
  const { t, dir } = useI18n();
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
      icon: WhatsAppIcon,
      color: "hover:text-[#25D366]",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/share/18kKGZAe1a/",
      icon: Facebook,
      color: "hover:text-[#1877F2]",
    },
  ];

  const colorMap: Record<string, string> = {
    LinkedIn: "bg-[#0077B5] hover:bg-[#005f93]",
    GitHub:   "bg-[#24292e] hover:bg-[#111]",
    WhatsApp: "bg-[#25D366] hover:bg-[#1ebe57]",
    Facebook: "bg-[#1877F2] hover:bg-[#0f60d0]",
  };

  return (
    <footer className="mt-12 pt-8 pb-6 border-t" dir={dir}>
      <div className="flex flex-col items-center gap-6">
        <p className="text-base font-semibold text-muted-foreground tracking-wide">
          {t("contact_me")}
        </p>
        <div className="flex items-center gap-3 justify-center">
          {links.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl text-white shadow-md transition-all duration-200 active:scale-95 hover:scale-110 hover:shadow-lg ${colorMap[label]}`}
            >
              <Icon className="h-6 w-6" />
            </a>
          ))}
        </div>
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
