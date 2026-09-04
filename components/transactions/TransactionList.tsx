"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import type { Transaction } from "@/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function TransactionList({
  transactions,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onEdit,
  onDelete,
  onNew,
}: TransactionListProps) {
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!loading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-4xl">
          🧾
        </div>
        <h3 className="text-lg font-semibold">No hay transacciones</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Aún no tienes movimientos registrados con estos filtros.
        </p>
        <Button className="mt-4" onClick={onNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar primera transacción
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="hidden md:table-cell">Banco</TableHead>
              <TableHead className="hidden lg:table-cell">Método</TableHead>
              <TableHead className="hidden xl:table-cell">Etiqueta</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : transactions.map((tx) => {
                  const color = tx.category?.color ?? "#0d9488";
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-md text-sm"
                            style={{ backgroundColor: `${color}1a` }}
                          >
                            {tx.category?.icon ?? "📌"}
                          </span>
                          <span className="hidden sm:inline">
                            {tx.category?.name ?? "Sin categoría"}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.detail || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tx.bank || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {tx.payment_method}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {tx.owner || "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          tx.type === "egreso" && "text-red-500",
                          tx.type === "ingreso" && "text-emerald-600",
                          tx.type === "ahorro" && "text-teal-500"
                        )}
                      >
                        {tx.type === "ingreso" ? "+" : tx.type === "egreso" ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tx.receipt_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setReceipt(tx.receipt_url)}
                              aria-label="Ver comprobante"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(tx)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setToDelete(tx)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} transacciones · Página {page} de {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la transacción
              {toDelete?.detail ? ` "${toDelete.detail}"` : ""} por{" "}
              {toDelete ? formatCurrency(toDelete.amount) : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) onDelete(toDelete.id);
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de comprobante */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Comprobante</DialogTitle>
          </DialogHeader>
          {receipt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receipt}
              alt="Comprobante"
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
