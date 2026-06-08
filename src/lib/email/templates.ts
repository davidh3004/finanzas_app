interface Alert {
  type:    string
  title:   string
  message: string
}

interface BudgetRow {
  name:   string
  spent:  number
  budget: number
  pct:    number
}

interface DailySummaryData {
  date:        string
  ingresos:    number
  gastos:      number
  disponible:  number
  alerts:      Alert[]
  budgetRows:  BudgetRow[]
  appUrl:      string
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    style:                 'currency',
    currency:              'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

const ALERT_COLORS: Record<string, string> = {
  budget_exceeded:  '#ef4444',
  low_balance:      '#f59e0b',
  high_utilization: '#f97316',
  card_due:         '#3b82f6',
}

export function buildDailySummaryHtml(data: DailySummaryData): string {
  const { date, ingresos, gastos, disponible, alerts, budgetRows, appUrl } = data

  const alertsHtml = alerts.length === 0
    ? `<p style="color:#6b7280;font-size:14px;margin:0;">Sin alertas nuevas hoy.</p>`
    : alerts.map(a => {
        const color = ALERT_COLORS[a.type] ?? '#6b7280'
        return `
        <div style="margin-bottom:10px;padding:12px 14px;border-left:4px solid ${color};background:#f9fafb;border-radius:0 6px 6px 0;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#111827;">${a.title}</p>
          <p style="margin:0;font-size:13px;color:#4b5563;">${a.message}</p>
        </div>`
      }).join('')

  const pctColor = (pct: number) => pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'

  const budgetHtml = budgetRows.length === 0
    ? `<p style="color:#6b7280;font-size:14px;margin:0;">No hay presupuestos configurados.</p>`
    : budgetRows.map(r => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;color:#374151;font-weight:500;">${r.name}</span>
          <span style="font-size:13px;color:${pctColor(r.pct)};font-weight:600;">${r.pct.toFixed(0)}%</span>
        </div>
        <div style="background:#e5e7eb;border-radius:4px;height:6px;overflow:hidden;">
          <div style="background:${pctColor(r.pct)};height:6px;width:${Math.min(r.pct, 100).toFixed(1)}%;border-radius:4px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:2px;">
          <span style="font-size:11px;color:#9ca3af;">Gastado: ${fmt(r.spent)}</span>
          <span style="font-size:11px;color:#9ca3af;">Límite: ${fmt(r.budget)}</span>
        </div>
      </div>`).join('')

  const disponibleColor = disponible >= 0 ? '#10b981' : '#ef4444'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Resumen diario — ${date}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#064e3b;border-radius:12px 12px 0 0;padding:24px 32px;">
            <p style="margin:0;color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Finanzas Personal</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Resumen diario</h1>
            <p style="margin:4px 0 0;color:#a7f3d0;font-size:13px;">${date}</p>
          </td>
        </tr>

        <!-- Stats del mes -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Mes actual</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="text-align:center;padding:12px;background:#f0fdf4;border-radius:8px;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Ingresos</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#10b981;">${fmt(ingresos)}</p>
                </td>
                <td width="4%"></td>
                <td width="33%" style="text-align:center;padding:12px;background:#fef2f2;border-radius:8px;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Gastos</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ef4444;">${fmt(gastos)}</p>
                </td>
                <td width="4%"></td>
                <td width="33%" style="text-align:center;padding:12px;background:#f9fafb;border-radius:8px;">
                  <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Disponible</p>
                  <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${disponibleColor};">${fmt(disponible)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:#ffffff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

        <!-- Alertas -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px;">
            <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">
              Alertas
              ${alerts.length > 0 ? `<span style="background:#ef4444;color:#fff;font-size:11px;padding:2px 7px;border-radius:20px;margin-left:8px;font-weight:600;">${alerts.length}</span>` : ''}
            </h2>
            ${alertsHtml}
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:#ffffff;padding:0 32px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"></td></tr>

        <!-- Presupuestos -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px;border-radius:0 0 12px 12px;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Presupuestos del mes</h2>
            ${budgetHtml}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <a href="${appUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">
              Abrir app →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding:0 0 24px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Generado automáticamente por tu app de finanzas · David, Santo Domingo RD
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
