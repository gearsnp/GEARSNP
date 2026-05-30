"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderOpen,
  Flag,
  Package,
  ShoppingCart,
  Truck,
  Calendar,
  Settings,
  Menu,
  X,
  LogOut,
  Tag,
  Ticket,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Fetch settings
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(console.error);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const siteName = settings?.site_name || "GearsNP";
  const logoUrl = settings?.logo_url;
  const primaryColor = settings?.primary_color || "#dc2626";

  // Don't show sidebar on login page
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Categories', href: '/admin/categories', icon: FolderOpen },
    { name: 'Teams', href: '/admin/teams', icon: Flag },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Deliveries', href: '/admin/deliveries', icon: Truck },
    { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Ticket Bookings', href: '/admin/ticket-bookings', icon: Ticket },
    { name: 'Ticket Scanner', href: '/admin/ticket-scanner', icon: ScanLine },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      <style>{`
        :root {
          --admin-primary: ${primaryColor};
        }
        .admin-primary {
          color: ${primaryColor};
        }
        .admin-primary-bg {
          background-color: ${primaryColor};
        }
      `}</style>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={80}
                height={40}
                className="object-contain"
              />
            ) : (
              <h1 className="text-lg font-bold admin-primary">{siteName}</h1>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 border-r border-border bg-card
            transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="p-6 border-b border-border hidden lg:block">
            {logoUrl ? (
              <div className="flex items-center gap-3">
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={100}
                  height={60}
                  className="object-contain"
                />
                <div>
                  <h1 className="text-lg font-bold">{siteName}</h1>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold admin-primary">{siteName}</h1>
                <p className="text-sm text-muted-foreground">Admin Panel</p>
              </div>
            )}
          </div>
          <nav className="p-4 space-y-2 mt-16 lg:mt-0 flex flex-col h-[calc(100%-4rem)] lg:h-[calc(100%-6rem)]">
            <div className="flex-1 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
            <div className="pt-4 border-t border-border">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/admin/login');
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-destructive/10 text-destructive w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto mt-16 lg:mt-0">
          {children}
        </main>
      </div>
    </>
  );
}
