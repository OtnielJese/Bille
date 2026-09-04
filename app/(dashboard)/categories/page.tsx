"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMOJIS = ["📌", "🍔", "🚗", "💊", "🎬", "💡", "👤", "🏠", "📚", "💰", "💻", "🐷", "🛒", "✈️", "🎮", "🏋️"];

const COLORS = [
  "#0d9488",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
  "#dc2626",
  "#0ea5e9",
  "#22c55e",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(40),
  icon: z.string().max(8),
  color: z.string(),
  type: z.enum(["ingreso", "egreso", "ambos"]),
});

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>}>
      <CategoriesContent />
    </Suspense>
  );
}

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📌");
  const [color, setColor] = useState("#0d9488");
  const [type, setType] = useState<"ingreso" | "egreso" | "ambos">("egreso");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setCategories(data.categories ?? []);
    } catch {
      toast.error("No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      resetForm();
      setFormOpen(true);
      router.replace("/categories");
    }
  }, [searchParams, router]);

  function resetForm(cat?: Category) {
    setName(cat?.name ?? "");
    setIcon(cat?.icon ?? "📌");
    setColor(cat?.color ?? "#0d9488");
    setType(cat?.type ?? "egreso");
    setError(null);
  }

  function openNew() {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    resetForm(cat);
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = categorySchema.safeParse({ name, icon, color, type });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/categories/${editing.id}` : "/api/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");

      toast.success(editing ? "Categoría actualizada" : "Categoría creada");
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la categoría");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${toDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar");

      toast.success("Categoría eliminada");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo eliminar la categoría");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} categorías
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="mt-3 h-5 w-28" />
                <Skeleton className="mt-2 h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-4xl">
            🏷️
          </div>
          <h3 className="text-lg font-semibold">Sin categorías</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea categorías para organizar tus gastos e ingresos.
          </p>
          <Button className="mt-4" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Crear primera categoría
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: `${cat.color}1a` }}
                  >
                    {cat.icon}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => openEdit(cat)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              disabled={(cat as any).transaction_count > 0}
                              onClick={() => setToDelete(cat)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(cat as any).transaction_count > 0 && (
                          <TooltipContent>
                            No se puede eliminar: tiene transacciones asociadas.
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <p className="font-semibold">{cat.name}</p>
                  {cat.is_default && <Badge variant="secondary">Por defecto</Badge>}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      cat.type === "ingreso" && "text-emerald-600",
                      cat.type === "egreso" && "text-red-500",
                      cat.type === "ambos" && "text-blue-600"
                    )}
                  >
                    {cat.type}
                  </Badge>
                  <span>{(cat as any).transaction_count ?? 0} transacciones</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              Personaliza el ícono, color y tipo de la categoría.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Compras"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <Label>Ícono (emoji)</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors",
                      icon === e
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform",
                      color === c
                        ? "scale-110 border-foreground"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Color personalizado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
                <option value="ambos">Ambos</option>
              </Select>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la categoría {toDelete?.icon} {toDelete?.name}. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
