"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MonthPicker } from "@/components/shared/MonthPicker";

export function DashboardMonthFilter({ value, currentMonth }: { value: string; currentMonth: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  function changeMonth(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    startTransition(() => router.push("/?" + params.toString(), { scroll: false }));
  }
  return (
    <div aria-busy={pending}>
      <MonthPicker value={value} currentMonth={currentMonth} onChange={changeMonth} disabled={pending} />
      {pending && <p role="status" className="mt-1 text-xs text-muted-foreground">Cargando período…</p>}
    </div>
  );
}
