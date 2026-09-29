import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  gradient: string;
  change?: number | null;
  positiveIsGood?: boolean;
  spark?: number[];
  footer?: React.ReactNode;
  sparkColor?: string;
  sparkLabel?: string;
  negative?: boolean;
  icon?: LucideIcon;
}

export function StatCard({
  title,
  value,
  gradient,
  change,
  positiveIsGood = true,
  spark,
  footer,
  sparkColor = "#0d9488",
  sparkLabel,
  negative = false,
  icon: Icon = Wallet,
}: StatCardProps) {
  const showChange = typeof change === "number" && !Number.isNaN(change);
  const changeIsGood = showChange
    ? change! >= 0
      ? positiveIsGood
      : !positiveIsGood
    : true;
  const sparkPath = buildSpark(spark);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-violet-soft">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            gradient
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className={cn("mt-2 text-2xl font-bold tabular-nums tracking-tight", negative ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
        {value}
      </p>

      <div className="mt-3 min-h-5">
        {showChange ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              changeIsGood
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            )}
          >
            {change! >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(change!).toFixed(1)}%
            <span className="font-normal opacity-70">vs mismo período anterior</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {footer ?? "Este mes"}
          </span>
        )}
      </div>

      {sparkPath && (
        <svg
          className="mt-3 h-10 w-full opacity-80"
          role="img"
          aria-label={sparkLabel ?? `${title}: movimientos diarios hasta hoy`}
          viewBox="0 0 100 40"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d={sparkPath}
            stroke={sparkColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

function buildSpark(data?: number[]): string {
  if (!data || data.length < 2 || data.every(value => value === 0)) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = 100 / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = 36 - ((v - min) / range) * 32;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${pts.join(" L")}`;
}
