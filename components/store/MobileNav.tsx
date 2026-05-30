"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Calendar, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export function MobileNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart: { id: string; quantity: number }[] = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartCount(cart.reduce((sum: number, item) => sum + item.quantity, 0));
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/shop", icon: Store, label: "Shop" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-[#e10600]">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive ? "text-[#e10600]" : "text-muted-foreground hover:text-[#e10600]"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] flex items-center justify-center p-0 px-1 text-[10px] bg-[#e10600]">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
