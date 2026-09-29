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

/** Valida la identidad con Supabase Auth antes de operar sobre datos privados. */
export async function getUserFast() {
  const { data: { user }, error } = await createClient().auth.getUser();
  return error ? null : user;
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
