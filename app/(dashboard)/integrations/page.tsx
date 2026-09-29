"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Landmark,
  Link2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { SyncEmailButton } from "@/components/dashboard/SyncEmailButton";

const BANKS = ["BBVA", "BCP", "Interbank", "Scotiabank", "Banco de la Nación"];

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const limit = searchParams.get('limit');
  useEffect(() => {
    if (connected === '1') toast.success('Gmail conectado correctamente');
    else if (error === '1') toast.error('No se pudo conectar Gmail. Inténtalo de nuevo.');
    else if (limit === '1') toast.error('Puedes conectar hasta tres cuentas de Gmail.');
  }, [connected, error, limit]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground">
          Conecta Gmail y elige cuándo importar tus movimientos bancarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Gmail — correos del banco
          </CardTitle>
          <CardDescription>
            Lee únicamente los correos de los bancos listados abajo (no todo tu
            inbox) y registra las transacciones detectadas cuando pulses sincronizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {BANKS.map((bank) => (
              <span
                key={bank}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                <Landmark className="h-3.5 w-3.5" />
                {bank}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/api/gmail/auth">
                <Link2 className="mr-1.5 h-4 w-4" />
                Conectar Gmail
              </Link>
            </Button>
          </div>

          <SyncEmailButton choosePeriod />
        </CardContent>
      </Card>
    </div>
  );
}
