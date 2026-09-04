"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BilleLogo } from "@/components/shared/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  function validate(): string | null {
    if (name.trim().length < 2) return "Ingresa tu nombre completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Ingresa un correo electrónico válido.";
    if (password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Este correo ya está registrado. Inicia sesión."
          : "No se pudo crear la cuenta. Inténtalo de nuevo."
      );
      setLoading(false);
      return;
    }

    setRegistered(true);
    toast.success("¡Cuenta creada! Verifica tu correo si es necesario.");
    setTimeout(() => router.push("/login"), 1800);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">¡Cuenta creada con éxito!</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tu perfil y categorías predeterminadas se crearon automáticamente.
            Redirigiéndote al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-4 py-10">
      <div className="flex w-full max-w-4xl flex-col items-center gap-10 lg:flex-row lg:gap-16">
        {/* Branding */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-5 inline-flex items-center justify-center">
            <BilleLogo markClassName="h-14" wordClassName="text-4xl" />
          </div>
          <p className="mt-5 max-w-md text-lg text-slate-500">
            Crea tu cuenta gratis y empieza a controlar tus finanzas con IA.
          </p>
        </div>

        {/* Tarjeta de registro */}
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Crear cuenta</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-[#0d9488] py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-[#0f766e] disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-teal-600 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
