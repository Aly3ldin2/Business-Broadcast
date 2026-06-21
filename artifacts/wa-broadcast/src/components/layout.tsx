import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Send, Settings, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "إرسال عرض", href: "/", icon: Send },
  { name: "الإعدادات", href: "/settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-1 py-4">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div
              className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-md mx-2 cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                }`}
              />
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
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b flex items-center px-4 gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-sidebar">
              <div className="flex h-14 shrink-0 items-center px-5 border-b">
                <span className="text-base font-bold text-primary">
                  WhatsApp Broadcast
                </span>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-primary">WhatsApp Broadcast</span>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-52 md:flex-col bg-sidebar border-r">
          <div className="flex h-14 shrink-0 items-center px-5 border-b">
            <span className="text-base font-bold text-primary leading-tight">
              WhatsApp<br />Broadcast
            </span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks />
          </div>
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              مجاني ومفتوح المصدر. يعمل عبر WhatsApp Business Cloud API.
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
