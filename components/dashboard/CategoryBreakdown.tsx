import type { CategoryStat } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function CategoryBreakdown({ stats }: { stats: CategoryStat[] }) {
  return (
    <div className="space-y-4">
      {stats.map((stat) => {
        const color = stat.category?.color ?? "#0d9488";
        return (
          <div key={stat.category?.id ?? "sin-categoria"} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${color}1a` }}
                >
                  {stat.category?.icon ?? "📌"}
                </span>
                {stat.category?.name ?? "Sin categoría"}
              </span>
              <span className="font-semibold">{formatCurrency(stat.amount)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, stat.percentage)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stat.percentage.toFixed(1)}% del total gastado
            </p>
          </div>
        );
      })}
    </div>
  );
}
