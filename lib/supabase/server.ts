import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Llamado desde un Server Component. Se ignora si el middleware
            // está refrescando las sesiones.
          }
        },
      },
    }
  );
}

/**
 * Obtiene el usuario autenticado leyendo la sesión de las cookies,
 * sin hacer una petición de red a Supabase Auth (más rápido que getUser()).
 * Solo refresca el token si ya expiró.
 */
export async function getUserFast() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession();
    return refreshed?.user ?? null;
  }
  return session.user;
}

export const getCurrentUser = cache(getUserFast);

/**
 * Obtiene el perfil del usuario con caché (React cache),
 * para no repetir la consulta en cada navegación entre módulos.
 */
export const getProfile = cache(async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data ?? null) as any;
});
