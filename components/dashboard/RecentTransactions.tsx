import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Transaction } from "@/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transacción</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay movimientos registrados.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => {
              const color = tx.category?.color ?? "#0d9488";
              const isExpense = tx.type === "egreso";
              const isIncome = tx.type === "ingreso";
              return (
                <TableRow key={tx.id}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${color}1a` }}
                      >
                        {tx.category?.icon ?? "📌"}
                      </span>
                      <span className="min-w-0 truncate font-medium">
                        {tx.detail || tx.category?.name || "Transacción"}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {tx.category?.name ?? "Sin categoría"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap text-right font-semibold",
                      isExpense && "text-red-500",
                      isIncome && "text-emerald-600",
                      tx.type === "ahorro" && "text-teal-500"
                    )}
                  >
                    {isIncome ? "+" : isExpense ? "-" : ""}
                    {formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Link
        href="/transactions"
        className="flex items-center justify-end gap-1 px-2 py-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        Ver todas
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
