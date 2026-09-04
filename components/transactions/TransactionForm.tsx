"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Category, Transaction } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/chat/ImageUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formSchema = z.object({
  type: z.enum(["ingreso", "egreso", "ahorro"]),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es requerida"),
  category_id: z.string().optional(),
  detail: z.string().optional(),
  bank: z.string().optional(),
  payment_method: z.string().optional(),
  owner: z.string().optional(),
});

const PAYMENT_METHODS = [
  "Efectivo",
  "Débito",
  "Crédito",
  "Transferencia",
  "Yape/Plin",
  "Otro",
];

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  transaction?: Transaction | null;
  onSaved: () => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  categories,
  transaction,
  onSaved,
}: TransactionFormProps) {
  const isEditing = !!transaction;

  const [type, setType] = useState<"ingreso" | "egreso" | "ahorro">("egreso");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bank, setBank] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [owner, setOwner] = useState("");
  const [detail, setDetail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setCategoryId(transaction.category_id ?? "");
      setAmount(String(transaction.amount));
      setDate(transaction.date.slice(0, 10));
      setBank(transaction.bank ?? "");
      setPaymentMethod(transaction.payment_method);
      setOwner(transaction.owner ?? "");
      setDetail(transaction.detail ?? "");
      setImage(null);
    } else {
      setType("egreso");
      setCategoryId("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setBank("");
      setPaymentMethod("Efectivo");
      setOwner("");
      setDetail("");
      setImage(null);
    }
    setErrors({});
  }, [open, transaction]);

  const filteredCategories = categories.filter(
    (c) => c.type === "ambos" || c.type === type
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({
      type,
      amount: parseFloat(amount),
      date,
      category_id: categoryId || undefined,
      detail: detail || undefined,
      bank: bank || undefined,
      payment_method: paymentMethod,
      owner: owner || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        isEditing ? `/api/transactions/${transaction!.id}` : "/api/transactions",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...parsed.data,
            imageBase64: image ? image.split(",")[1] : null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar la transacción.");
      }

      toast.success(
        isEditing ? "Transacción actualizada" : "Transacción registrada"
      );
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error?.message ?? "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar transacción" : "Nueva transacción"}
          </DialogTitle>
          <DialogDescription>
            Registra un movimiento de dinero manualmente o adjunta un comprobante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
                <option value="ahorro">Ahorro</option>
              </Select>
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                S/
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                placeholder="BCP, Interbank..."
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dueño / Responsable</Label>
            <Input
              placeholder="¿Quién realizó el gasto?"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Detalle</Label>
            <Textarea
              placeholder="Descripción del movimiento..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <div className={cn("flex items-center rounded-lg border border-dashed p-3")}>
              <ImageUpload image={image} onChange={setImage} disabled={loading} />
              <p className="ml-2 text-xs text-muted-foreground">
                Adjunta una foto del comprobante
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
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
  );
}
