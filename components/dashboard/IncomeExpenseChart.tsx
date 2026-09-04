"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.fill }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.dataKey === "ingresos" ? "Ingresos" : "Egresos"}:
          </span>
          <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            style={{ stroke: "hsl(var(--border))" }}
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v: number) => `S/ ${v}`}
            className="text-xs text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
          <Legend
            formatter={(value) => (
              <span className="text-sm capitalize text-foreground">
                {value === "ingresos" ? "Ingresos" : "Egresos"}
              </span>
            )}
          />
          <Bar dataKey="ingresos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
          <Bar dataKey="egresos" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
