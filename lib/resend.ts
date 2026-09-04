import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface BudgetAlertData {
  name?: string;
  subject: string;
  budgetRemaining: number;
  budgetPctLeft: number;
  topCategories: { name: string; icon: string; amount: number }[];
}

export async function sendBudgetAlert(to: string, data: BudgetAlertData) {
  const { data: result, error } = await resend.emails.send({
    from: "Bille <onboarding@resend.dev>",
    to: [to],
    subject: data.subject,
    html: buildEmailHtml(data),
  });

  if (error) {
    throw new Error(error.message);
  }
  return result;
}

function buildEmailHtml(data: BudgetAlertData): string {
  const pct = Math.max(0, Math.min(100, Math.round(data.budgetPctLeft)));
  const barColor = pct > 30 ? "#10b981" : pct > 15 ? "#f59e0b" : "#ef4444";
  const remaining = formatPEN(data.budgetRemaining);

  const rows = (data.topCategories?.length
    ? data.topCategories
    : [{ name: "Sin gastos aún", icon: "📊", amount: 0 }]
  )
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${c.icon} ${c.name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatPEN(c.amount)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 10px 30px rgba(15,27,53,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f1b35;padding:28px 32px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:22px;">�</span>
                <span style="color:#ffffff;font-size:20px;font-weight:700;">Bille</span>
              </div>
              <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Tu gestor financiero inteligente</p>
            </td>
          </tr>
          <!-- Cuerpo -->
          <tr>
            <td style="padding:32px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;color:#c2410c;font-size:16px;font-weight:700;">⚠️ Tu presupuesto está bajo</p>
                <p style="margin:6px 0 0;color:#9a3412;font-size:14px;">Hola ${data.name || ""}, te queda poco margen del presupuesto de este mes.</p>
              </div>

              <p style="font-size:14px;color:#475569;margin:0 0 8px;">Presupuesto restante</p>
              <p style="font-size:32px;font-weight:800;color:#0f1b35;margin:0 0 16px;">${remaining}</p>

              <!-- Barra SVG -->
              <svg width="100%" height="16" style="display:block;border-radius:999px;background:#e2e8f0;margin-bottom:24px;">
                <rect width="${pct}%" height="16" rx="8" fill="${barColor}" />
              </svg>
              <p style="font-size:13px;color:#64748b;margin:0 0 28px;">${pct}% del presupuesto disponible</p>

              <p style="font-size:14px;font-weight:700;color:#0f1b35;margin:0 0 8px;">Top categorías de gasto</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tbody>${rows}</tbody>
              </table>

              <a href="${APP_URL}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">
                Ver mis finanzas
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">Enviado por <strong>Bille</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatPEN(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${sign}S/ ${formatted}`;
}
