import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint público de "heartbeat".
 * Lo usan cron-job.org / UptimeRobot para mantener la app y Supabase
 * activos (evita que el proyecto gratuito de Supabase se pause).
 *
 * También consulta la base de datos para que el "latido" realmente
 * toque Supabase y no solo el servidor de la app.
 */
export async function GET() {
  try {
    const supabase = createClient();
    // Consulta ligera: cuenta tablas para verificar conexión con la BD.
    const { data, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, db: "error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      db: "connected",
      count: data,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, db: "error", message: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}
