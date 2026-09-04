"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, Loader2, Mail, Send, TrendingUp, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AlertHistory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDatetime } from "@/lib/utils";
import { toast } from "sonner";

export default function AlertsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(20);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [spendLimit, setSpendLimit] = useState(100);
  const [period, setPeriod] = useState("diaria");
  const [savingLimit, setSavingLimit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [budgetRes, historyRes, settingsRes] = await Promise.all([
        fetch("/api/budget"),
        user
          ? supabase
              .from("alert_history")
              .select("*")
              .eq("user_id", user.id)
              .order("sent_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        fetch("/api/alerts/settings"),
      ]);

      const budget = await budgetRes.json();
      setEmail(budget.budget?.alert_email ?? null);
      setThreshold(budget.budget?.alert_threshold_pct ?? 20);
      setHistory((historyRes.data as AlertHistory[]) ?? []);

      const settings = await settingsRes.json();
      setSpendLimit(Number(settings.settings?.spend_limit ?? 100));
      setPeriod(settings.settings?.period ?? "diaria");
    } catch {
      toast.error("No se pudieron cargar las alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveLimit() {
    setSavingLimit(true);
    try {
      const res = await fetch("/api/alerts/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spend_limit: spendLimit,
          period,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      toast.success("Límite de gasto guardado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSavingLimit(false);
    }
  }

  async function handleSendTest() {
    setSending(true);
    try {
      const res = await fetch("/api/alerts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test",
          budget_remaining: 100,
          budget_pct_left: 100,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar");

      toast.success("Correo de prueba enviado");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo enviar el correo de prueba");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estado de alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Estado de alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : email ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Alertas activas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Enviaremos alertas a <strong>{email}</strong> cuando te quede
                      menos del {threshold}% del presupuesto.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleSendTest} disabled={sending}>
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar alerta de prueba
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Mail className="h-6 w-6 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Sin email configurado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Configura tu email de alertas para recibir avisos de presupuesto.
                  </p>
                </div>
              </div>
            )}

            <Link
              href="/budget"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Editar configuración →
            </Link>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo funcionan?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Configura tu presupuesto mensual y un email de alertas.</p>
            <p>2. Define un umbral de alerta (por defecto 20%).</p>
            <p>
              3. Cuando tu presupuesto restante caiga por debajo del umbral,
              Bille te enviará un correo con el detalle.
            </p>
            <p>
              💡 También puedes registrar gastos desde el Chat IA con una foto del
              comprobante; la alerta se envía automáticamente.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Límite de gasto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Límite de gasto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Te avisamos cuando superes este monto de gastos en el período
            elegido: diario, semanal, quincenal o mensual.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Monto máximo (S/)</Label>
              <Input
                type="number"
                min={1}
                value={spendLimit}
                onChange={(e) => setSpendLimit(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frecuencia</Label>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-36"
              >
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </Select>
            </div>
            <Button onClick={handleSaveLimit} disabled={savingLimit}>
              {savingLimit && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de alertas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellRing className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Aún no se ha enviado ninguna alerta.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead className="text-right">Restante en ese momento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDatetime(h.sent_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={h.type === "test" ? "secondary" : "warning"}>
                          {h.type === "test" ? "Prueba" : "Presupuesto bajo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {h.sent_to ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {h.budget_remaining != null
                          ? formatCurrency(Number(h.budget_remaining))
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {h.success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Enviado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500">
                            <XCircle className="h-4 w-4" /> Error
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
