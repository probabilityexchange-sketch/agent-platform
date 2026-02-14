"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCredits } from "@/hooks/useCredits";
import { RandiLogo } from "@/components/branding/RandiLogo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/agents", label: "Agents", icon: "cpu" },
  { href: "/containers", label: "Containers", icon: "box" },
  { href: "/credits", label: "Credits", icon: "coins" },
];

const icons: Record<string, string> = {
  grid: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  cpu: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  coins: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export function Sidebar() {
  const pathname = usePathname();
  const { balance } = useCredits();

  return (
    <aside className="w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)] p-4 flex flex-col">
      <div className="mb-6 px-3">
        <RandiLogo size="sm" variant="icon-only" />
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={icons[item.icon]}
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border pt-4">
        <div className="px-3 py-2 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Credits</p>
          <p className="text-lg font-semibold">{balance.toLocaleString()}</p>
        </div>
      </div>
    </aside>
  );
}
