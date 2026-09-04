"use client";

import { Download, Search, X } from "lucide-react";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface TransactionFilterState {
  type: string;
  category_id: string;
  bank: string;
  date_from: string;
  date_to: string;
  search: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilterState;
  onChange: (filters: TransactionFilterState) => void;
  categories: Category[];
  banks: string[];
  onExport: () => void;
  exporting?: boolean;
}

export function TransactionFilters({
  filters,
  onChange,
  categories,
  banks,
  onExport,
  exporting,
}: TransactionFiltersProps) {
  function set<K extends keyof TransactionFilterState>(
    key: K,
    value: TransactionFilterState[K]
  ) {
    onChange({ ...filters, [key]: value });
  }

  const hasFilters =
    filters.type ||
    filters.category_id ||
    filters.bank ||
    filters.date_from ||
    filters.date_to ||
    filters.search;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filters.type || "all"}
          onValueChange={(v) => set("type", v === "all" ? "" : v)}
        >
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="egreso">Egresos</TabsTrigger>
            <TabsTrigger value="ingreso">Ingresos</TabsTrigger>
            <TabsTrigger value="ahorro">Ahorros</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  type: "",
                  category_id: "",
                  bank: "",
                  date_from: "",
                  date_to: "",
                  search: "",
                })
              }
            >
              <X className="mr-1 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onExport} disabled={exporting}>
            <Download className="mr-1 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Categoría</Label>
          <Select
            value={filters.category_id}
            onChange={(e) => set("category_id", e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Banco</Label>
          <Select value={filters.bank} onChange={(e) => set("bank", e.target.value)}>
            <option value="">Todos</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => set("date_from", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => set("date_to", e.target.value)}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por detalle..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
