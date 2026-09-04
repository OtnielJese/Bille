"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useSidebar } from "@/components/shared/Sidebar";
import { toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "Chat IA",
  "/transactions": "Transacciones",
  "/budget": "Presupuesto",
  "/categories": "Categorías",
  "/alerts": "Alertas",
};

export function Topbar({ user }: { user: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen } = useSidebar();
  const [search, setSearch] = useState("");

  const title = pageTitles[pathname] ?? "Bille";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
    router.refresh();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="hidden text-lg font-bold tracking-tight sm:block">{title}</h1>

      {/* Buscador global */}
      <form
        onSubmit={handleSearchSubmit}
        className="relative ml-2 hidden w-full max-w-xs md:block"
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar transacciones..."
          className="h-10 w-full rounded-full border bg-card pl-10 pr-9 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Botón prominente Chat IA */}
        <Button
          asChild
          size="sm"
          className="relative h-10 gap-2 rounded-2xl bg-[#0d9488] px-4 font-bold shadow-violet-soft transition-all hover:-translate-y-0.5 hover:bg-[#0f766e] hover:shadow-violet-high"
        >
          <Link href="/chat">
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="hidden sm:inline">Chat IA</span>
            <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold md:inline">
              Voz / Foto
            </span>
          </Link>
        </Button>

        {/* Acciones contextuales */}
        {pathname === "/" && (
          <>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/chat">
                <Upload className="mr-1.5 h-4 w-4" />
                Subir comprobante
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/transactions?new=1">
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva transacción
              </Link>
            </Button>
          </>
        )}
        {pathname === "/transactions" && (
          <Button size="sm" asChild>
            <Link href="/transactions?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva transacción
            </Link>
          </Button>
        )}
        {pathname === "/categories" && (
          <Button size="sm" asChild>
            <Link href="/categories?new=1">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva categoría
            </Link>
          </Button>
        )}

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
          <Link href="/alerts" aria-label="Alertas">
            <Bell className="h-5 w-5" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="hidden h-9 w-9 sm:inline-flex" asChild>
          <Link href="/budget" aria-label="Configuración">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[#0d9488] text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name ?? "Usuario"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/budget")}>
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/budget")}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
