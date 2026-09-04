import { cn } from "@/lib/utils";

/**
 * Ícono real de Bille (imagen PNG subida en /public/logo.png).
 */
export function BilleLogoImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Bille"
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}

/**
 * Logo completo: ícono real + texto "Bille".
 */
export function BilleLogo({
  className,
  markClassName,
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BilleLogoImage className={cn("h-10 w-auto shrink-0", markClassName)} />
      <span
        className={cn(
          "bg-gradient-to-r from-[#1d4ed8] to-[#06b6d4] bg-clip-text text-lg font-extrabold tracking-tight text-transparent",
          wordClassName
        )}
      >
        Bille
      </span>
    </span>
  );
}

/** Wordmark "Bille" en azul degradado (respaldo SVG/vectorial). */
export function BilleWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#1d4ed8] to-[#06b6d4] bg-clip-text font-extrabold tracking-tight text-transparent",
        className
      )}
    >
      Bille
    </span>
  );
}

/** Marca "Bille": la "B" formada por cintas entrelazadas teal/azul (respaldo SVG). */
export function BilleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="bille-teal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="bille-blue" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>

      {/* Tallo izquierdo de la "B" */}
      <path
        d="M15 7 V41"
        stroke="url(#bille-teal)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Lóbulo superior */}
      <path
        d="M15 7 H26 C35 7 37 15 29 19 C23.5 22.5 18 22.5 15 24"
        stroke="url(#bille-blue)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Lóbulo inferior */}
      <path
        d="M15 24 H26 C35 24 37 32 29 36 C23.5 39.5 18 39.5 15 41"
        stroke="url(#bille-teal)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Círculo cian brillante central */}
      <circle cx="27" cy="23" r="10" fill="#22d3ee" opacity="0.22" />
      <circle cx="27" cy="23" r="4.5" fill="#22d3ee" />
    </svg>
  );
}
