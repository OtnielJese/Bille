"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidMonth, shiftMonth } from "@/lib/month-filter";

interface MonthPickerProps {
  value: string;
  currentMonth: string;
  onChange: (value: string) => void;
  allowAll?: boolean;
  disabled?: boolean;
}

export function MonthPicker({ value, currentMonth, onChange, allowAll = false, disabled }: MonthPickerProps) {
  const id = useId();
  const base = isValidMonth(value) ? value : currentMonth;
  const previous = shiftMonth(base, -1);
  const next = shiftMonth(base, 1);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">Mes y año</Label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label="Mes anterior" disabled={disabled || !isValidMonth(previous)} onClick={() => onChange(previous)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input id={id} type="month" min="2000-01" max="2100-12" value={value} disabled={disabled} className="w-44" onChange={e => {
            if (isValidMonth(e.target.value) || (allowAll && e.target.value === "")) onChange(e.target.value);
          }} />
          <Button type="button" variant="outline" size="icon" aria-label="Mes siguiente" disabled={disabled || !isValidMonth(next)} onClick={() => onChange(next)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || value === currentMonth} onClick={() => onChange(currentMonth)}>Mes actual</Button>
        {allowAll && <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange("")}>Todos los meses</Button>}
      </div>
    </div>
  );
}
