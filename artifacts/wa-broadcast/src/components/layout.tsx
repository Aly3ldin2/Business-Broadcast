import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Users, LayoutDashboard, List, MessageSquare, Send, Settings, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Lists", href: "/lists", icon: List },
  { name: "Templates", href: "/templates", icon: MessageSquare },
  { name: "Broadcasts", href: "/broadcasts", icon: Send },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="flex flex-1 flex-col gap-1 py-4">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div className={`group flex items-center px-4 py-2 text-sm font-medium rounded-md mx-2 cursor-pointer transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"}`} />
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
        {/* Mobile sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden absolute top-4 left-4 z-40">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <div className="flex h-16 shrink-0 items-center px-6 border-b">
              <span className="text-lg font-bold text-primary">Broadcast Manager</span>
            </div>
            <NavLinks />
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col bg-sidebar border-r">
          <div className="flex h-16 shrink-0 items-center px-6 border-b">
            <span className="text-lg font-bold text-primary">Broadcast Manager</span>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
