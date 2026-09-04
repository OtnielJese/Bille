"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  MessageSquare,
  ArrowLeftRight,
  Tags,
  Wallet,
  Plug,
  X,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BilleLogo } from "@/components/shared/Logo";

type SidebarContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  aiHighlight?: boolean;
}

const mainNav: NavItem[] = [
  { label: "Panel Principal", href: "/", icon: LayoutDashboard },
  { label: "Chat IA", href: "/chat", icon: MessageSquare, aiHighlight: true },
  { label: "Transacciones", href: "/transactions", icon: ArrowLeftRight },
];

const configNav: NavItem[] = [
  { label: "Presupuesto", href: "/budget", icon: Wallet },
  { label: "Categorías", href: "/categories", icon: Tags },
  { label: "Alertas", href: "/alerts", icon: Bell },
  { label: "Integraciones", href: "/integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Marca */}
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <BilleLogo markClassName="h-10" wordClassName="text-base leading-none" />
          </Link>
          <button
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-hide">
          <NavSection label="Principal" items={mainNav} pathname={pathname} onNavigate={() => setOpen(false)} />
          <NavSection label="Configuración" items={configNav} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                prefetch={true}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#e0fbf6] font-semibold text-[#0d9488]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#0d9488]" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive
                      ? "text-[#0d9488]"
                      : item.aiHighlight
                        ? "text-[#0d9488]"
                        : "text-muted-foreground group-hover:text-[#0d9488]"
                  )}
                />
                {item.label}
                {item.aiHighlight && (
                  <span className="ml-auto flex items-center gap-1 rounded-md bg-[#0d9488] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    <Sparkles className="h-3 w-3" />
                    Auto
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
