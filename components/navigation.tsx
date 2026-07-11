"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole, NavItem } from "@/lib/types";

const navItems: Record<UserRole, NavItem[]> = {
  farmer: [
    { label: "Dashboard", href: "/farmer/dashboard" },
    { label: "My Products", href: "/farmer/products" },
    { label: "Orders", href: "/farmer/orders" },
    { label: "Ratings", href: "/farmer/ratings" },
  ],
  buyer: [
    { label: "Dashboard", href: "/buyer/dashboard" },
    { label: "Browse Products", href: "/buyer/browse" },
    { label: "My Orders", href: "/buyer/orders" },
    { label: "Ratings", href: "/buyer/ratings" },
  ],
  agent: [
    { label: "Dashboard", href: "/agent/dashboard" },
    { label: "Deliveries", href: "/agent/deliveries" },
    { label: "Ratings", href: "/agent/ratings" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Users", href: "/admin/users" },
    { label: "Approvals", href: "/admin/approvals" },
    { label: "Disputes", href: "/admin/disputes" },
    { label: "Analytics", href: "/admin/analytics" },
  ],
};

interface NavigationProps {
  role?: UserRole | null;
}

export function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNavItems = role ? navItems[role] : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">🌾</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            FarmConnect
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {currentNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons / User menu */}
        <div className="hidden items-center gap-2 md:flex">
          {role ? (
            <>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                {role}
              </span>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {currentNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-md px-3 py-3 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4">
            {role ? (
              <Button variant="outline" className="w-full">
                Logout
              </Button>
            ) : (
              <>
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
