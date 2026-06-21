"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/homes", label: "Casas", Icon: Home },
  { href: "/tasks", label: "Tarefas", Icon: CheckSquare },
  { href: "/profile", label: "Perfil", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card safe-area-inset-bottom">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
