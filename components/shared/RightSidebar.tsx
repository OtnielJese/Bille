"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Pencil, Unlink, Users } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type GmailAccount = { id: string; email: string; last_synced_at: string | null };

export function RightSidebar({ user }: { user: Profile | null }) {
  const [budget, setBudget] = useState<{ remaining: number; pctUsed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/gmail/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    async function loadBudget() {
      try {
        const res = await fetch("/api/budget");
        if (res.ok) {
          const data = await res.json();
          setBudget({ remaining: data.remaining ?? 0, pctUsed: data.pct_used ?? 0 });
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    loadBudget();
    loadAccounts();
  }, [loadAccounts]);

  const pctUsed = budget?.pctUsed ?? 0;
  const pctRemaining = Math.max(0, 100 - pctUsed);
  const barColor = pctUsed >= 90 ? "bg-red-500" : pctUsed >= 70 ? "bg-amber-500" : "bg-[#0d9488]";

  async function handleDisconnect(id: string) {
    try {
      const res = await fetch("/api/gmail/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo desvincular");
        return;
      }
      toast.success("Correo desvinculado");
      loadAccounts();
    } catch {
      toast.error("No se pudo desvincular");
    }
  }

  function openEdit() {
    setNameValue(user?.name ?? "");
    setEditOpen(true);
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Perfil actualizado");
      setEditOpen(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-6 border-l bg-muted/40 p-5 xl:flex">
      {/* Presupuesto restante */}
      <div className="rounded-2xl border bg-card p-5 shadow-violet-soft">
        <p className="text-sm font-medium text-muted-foreground">Budget remaining</p>
        {loading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-2 w-full" />
          </div>
        ) : (
          <>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(budget?.remaining ?? 0)}
            </p>
            <Progress value={pctRemaining} className="mt-3 h-2" indicatorClassName={barColor} />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{pctRemaining}% disponible</span>
              <Link
                href="/budget"
                className="font-semibold text-[#0d9488] transition-colors hover:text-[#0f766e]"
              >
                Ver
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Correos conectados */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          Correos conectados
        </p>
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <div className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground shadow-violet-soft">
              Sin correos conectados.{" "}
              <Link href="/integrations" className="font-semibold text-[#0d9488]">
                Conectar
              </Link>
            </div>
          ) : (
            accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-2xl border bg-card p-3 shadow-violet-soft"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{a.email}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {a.last_synced_at
                      ? `Últ. sync: ${new Date(a.last_synced_at).toLocaleString("es-PE")}`
                      : "Aún sin sincronizar"}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(a.id)}
                  title="Desvincular correo"
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Desvincular
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comunidad / perfil */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Comunidad
        </p>
        <div className="rounded-2xl border bg-card p-4 shadow-violet-soft">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={user?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[#0d9488] text-white">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name ?? "Usuario"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={openEdit}
              title="Editar nombre"
              aria-label="Editar nombre"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveName} disabled={savingName}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
