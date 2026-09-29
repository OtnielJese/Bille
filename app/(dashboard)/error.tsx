"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center">
      <AlertCircle className="h-10 w-10 text-amber-500" />
      <h1 className="text-xl font-bold">No pudimos cargar tus finanzas</h1>
      <p className="text-sm text-muted-foreground">Comprueba tu conexión y vuelve a intentarlo para consultar tus movimientos y saldos.</p>
      <Button onClick={reset}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button>
    </div>
  );
}
