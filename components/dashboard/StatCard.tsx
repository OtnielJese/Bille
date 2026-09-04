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
  footer?: string;
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

      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>

      <div className="mt-3">
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
            <span className="font-normal opacity-70">vs mes anterior</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {footer ?? "Este mes"}
          </span>
        )}
      </div>

      {sparkPath && (
        <svg
          className="absolute bottom-4 right-4 h-12 w-24 opacity-70"
          viewBox="0 0 100 40"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d={sparkPath}
            stroke="rgba(124,58,237,0.55)"
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
  if (!data || data.length < 2) return "";
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
