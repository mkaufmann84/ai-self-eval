"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Analysis" },
  { href: "/convo-tree", label: "Convo Tree" },
  { href: "/settings", label: "Settings" },
];

interface TopNavProps {
  className?: string;
}

export default function TopNav({ className }: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-3 flex-wrap", className)}>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors border",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
