"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isValidMonth, monthFromRange } from "@/lib/month-filter";
import { monthRange } from "@/lib/finance";
import { createClient } from "@/lib/supabase/client";
import type { Category, Transaction } from "@/types";
import {
  TransactionFilters,
  type TransactionFilterState,
} from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { toast } from "sonner";

const DEFAULT_FILTERS: TransactionFilterState = {
  type: "",
  category_id: "",
  bank: "",
  date_from: "",
  date_to: "",
  search: "",
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const monthParam = searchParams.get("month");
  const selectedMonth = isValidMonth(monthParam) ? monthParam : "";
  const [filters, setFilters] = useState<TransactionFilterState>(DEFAULT_FILTERS);
  const activeFilters = useMemo(() => {
    if (!selectedMonth) return filters;
    const range = monthRange(selectedMonth + "-01");
    return { ...filters, date_from: range.start, date_to: range.end };
  }, [filters, selectedMonth]);
  const requestId = useRef(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Abrir formulario desde ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace("/transactions?" + params.toString(), { scroll: false });
    }
  }, [searchParams, router]);

  // Búsqueda global desde el Topbar (?q=...)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setFilters((prev) => ({ ...prev, search: q }));
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      router.replace("/transactions?" + params.toString(), { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => { setPage(1); }, [selectedMonth]);

  // Cargar categorías y bancos
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [catRes, bankRes] = await Promise.all([
        fetch("/api/categories"),
        supabase
          .from("transactions")
          .select("bank")
          .eq("user_id", user.id)
          .not("bank", "is", null),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories ?? []);
      }

      const uniqueBanks = Array.from(
        new Set(
          (bankRes.data ?? [])
            .map((b: any) => b.bank)
            .filter((b: string) => b && b.trim().length > 0)
        )
      ) as string[];
      setBanks(uniqueBanks);
    })();
  }, []);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (activeFilters.type) params.set("type", activeFilters.type);
      if (activeFilters.category_id) params.set("category_id", activeFilters.category_id);
      if (activeFilters.bank) params.set("bank", activeFilters.bank);
      if (activeFilters.date_from) params.set("date_from", activeFilters.date_from);
      if (activeFilters.date_to) params.set("date_to", activeFilters.date_to);
      if (activeFilters.search) params.set("search", activeFilters.search);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar transacciones.");

      if (currentRequest !== requestId.current) return;
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch (error: any) {
      if (currentRequest === requestId.current) toast.error(error?.message ?? "No se pudieron cargar las transacciones");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, activeFilters]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFiltersChange(next: TransactionFilterState) {
    const month = monthFromRange(next.date_from, next.date_to);
    setFilters({ ...next, date_from: month ? "" : next.date_from, date_to: month ? "" : next.date_to });
    setPage(1);
    if (month !== selectedMonth) {
      const params = new URLSearchParams(searchParams.toString());
      if (month) params.set("month", month); else params.delete("month");
      router.push("/transactions?" + params.toString(), { scroll: false });
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Transacción eliminada");
      window.dispatchEvent(new Event("finance-updated"));
      load();
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "No se pudo eliminar la transacción");
    }
  }

  function handleEdit(tx: Transaction) {
    setEditing(tx);
    setFormOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "1000");
      if (activeFilters.type) params.set("type", activeFilters.type);
      if (activeFilters.category_id) params.set("category_id", activeFilters.category_id);
      if (activeFilters.bank) params.set("bank", activeFilters.bank);
      if (activeFilters.date_from) params.set("date_from", activeFilters.date_from);
      if (activeFilters.date_to) params.set("date_to", activeFilters.date_to);
      if (activeFilters.search) params.set("search", activeFilters.search);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      const rows: Transaction[] = data.transactions ?? [];

      const header = [
        "fecha",
        "tipo",
        "categoria",
        "detalle",
        "banco",
        "metodo_pago",
        "dueno",
        "monto",
      ];
      const lines = rows.map((t) =>
        [
          t.date,
          t.type,
          t.category?.name ?? "",
          t.detail ?? "",
          t.bank ?? "",
          t.payment_method,
          t.owner ?? "",
          t.amount,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );

      const csv = [header.join(","), ...lines].join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "transacciones-bille.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("CSV exportado");
      window.dispatchEvent(new Event("finance-updated"));
    } catch {
      toast.error("No se pudo exportar el CSV");
    } finally {
      setExporting(false);
    }
  }

  const bankList = useMemo(() => banks, [banks]);

  return (
    <div className="space-y-6">
      <TransactionFilters
        filters={activeFilters}
        onChange={handleFiltersChange}
        categories={categories}
        banks={bankList}
        onExport={handleExport}
        exporting={exporting}
      />

      <TransactionList
        transactions={transactions}
        loading={loading}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNew={handleNew}
      />

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        transaction={editing}
        onSaved={load}
      />
    </div>
  );
}
