import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Send, Settings, Users, Menu, Radio } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Home", href: "/", icon: Send },
  { name: "Lists", href: "/lists", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SiteLogo() {
  return (
    <Link href="/">
      <div className="flex items-center gap-2 cursor-pointer select-none group">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
          Broadcast<br />Sender
        </span>
      </div>
    </Link>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-0.5 py-3 px-2">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="mr-3 h-4 w-4 shrink-0" />
              {item.name}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
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
            </SheetContent>
          </Sheet>
          <SiteLogo />
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-48 md:flex-col border-r bg-background">
          <div className="flex h-14 shrink-0 items-center px-4 border-b">
            <SiteLogo />
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks />
          </div>
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Free & open source
            </p>
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
