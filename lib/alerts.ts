import type { SupabaseClient } from '@supabase/supabase-js';
import { monthRange, periodRange, peruToday, sumMoney } from '@/lib/finance';
import { loadFinancialSummary } from '@/lib/financial-summary';
import { sendBudgetAlert } from '@/lib/resend';
/** Called after persisted expenses. Mail failures must never undo a saved transaction. */
export async function evaluateAlerts(supabase: SupabaseClient, userId: string, expenseDates: string[]) {
    if (!expenseDates.length)
        return;
    try {
        const today = peruToday();
        const { month, year, start, end } = monthRange(today);
        const [settingsResult, profileResult] = await Promise.all([
            supabase.from('alert_settings').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('profiles').select('name, email').eq('id', userId).single(),
        ]);
        if (settingsResult.error)
            throw settingsResult.error;
        if (profileResult.error)
            throw profileResult.error;
        const settings = settingsResult.data;
        if (settings?.enabled === false)
            return;
        const summary = await loadFinancialSummary(supabase, userId, month, year);
        const to = summary.budget?.alert_email || profileResult.data?.email;
        if (!to)
            return;
        const candidates: {
            type: string;
            subject: string;
            remaining: number;
            pct: number;
            since: string;
            description: string;
            periodLabel: string;
            rows: any[];
        }[] = [];
        const pct = summary.total_budget > 0 ? (summary.budget_remaining! / summary.total_budget) * 100 : 100;
        if (expenseDates.some(d => d >= start && d <= end) && summary.total_budget > 0 && pct < (summary.budget?.alert_threshold_pct ?? 20)) {
            candidates.push({ type: 'budget_low', subject: 'Tu presupuesto está bajo', remaining: summary.budget_remaining!, pct,
                since: today + 'T00:00:00-05:00', description: 'Te queda poco margen del presupuesto de este mes.', periodLabel: 'presupuesto mensual', rows: summary.transactions });
        }
        if (settings && Number(settings.spend_limit) > 0) {
            const range = periodRange(settings.period, today);
            if (expenseDates.some(d => d >= range.start && d <= range.end)) {
                const rows: any[] = [];
                for (let offset = 0;; offset += 1000) {
                    const result = await supabase.from('transactions').select('type, amount, category:categories(name, icon)').eq('user_id', userId)
                        .eq('type', 'egreso').gte('date', range.start).lte('date', range.end).order('id').range(offset, offset + 999);
                    if (result.error)
                        throw result.error;
                    rows.push(...(result.data ?? []));
                    if ((result.data?.length ?? 0) < 1000)
                        break;
                }
                const spent = sumMoney(rows.map(t => t.amount));
                const limit = Number(settings.spend_limit);
                if (spent > limit)
                    candidates.push({ type: 'spend_limit:' + settings.period + ':' + range.start, subject: 'Superaste tu límite de gasto',
                        remaining: sumMoney([limit, -spent]), pct: (limit - spent) / limit * 100, since: range.start + 'T00:00:00-05:00',
                        description: 'Los gastos del período ' + range.start + ' al ' + range.end + ' superaron el límite que configuraste.', periodLabel: 'límite de gasto', rows });
            }
        }
        for (const candidate of candidates) {
            const previous = await supabase.from('alert_history').select('id').eq('user_id', userId).eq('type', candidate.type).eq('success', true).gte('sent_at', candidate.since).limit(1);
            if (previous.error)
                throw previous.error;
            if (previous.data?.length)
                continue;
            const grouped = new Map<string, {
                name: string;
                icon: string;
                amount: number;
            }>();
            for (const row of candidate.rows.filter(t => t.type === 'egreso')) {
                const name = row.category?.name ?? 'Sin categoría';
                const item = grouped.get(name) ?? { name, icon: row.category?.icon ?? '📌', amount: 0 };
                item.amount = sumMoney([item.amount, row.amount]);
                grouped.set(name, item);
            }
            let success = false;
            try {
                await sendBudgetAlert(to, { name: profileResult.data?.name, subject: candidate.subject + ' — Bille', heading: candidate.subject,
                    description: candidate.description, periodLabel: candidate.periodLabel, budgetRemaining: candidate.remaining, budgetPctLeft: candidate.pct,
                    topCategories: [...grouped.values()].sort((a, b) => b.amount - a.amount).slice(0, 3) }, userId + ":" + candidate.type + ":" + candidate.since);
                success = true;
            }
            catch {
                console.error('No se pudo enviar una alerta financiera.');
            }
            const saved = await supabase.from('alert_history').insert({ user_id: userId, type: candidate.type, subject: candidate.subject,
                sent_to: to, budget_remaining: candidate.remaining, budget_pct_left: Math.round(candidate.pct), success });
            if (saved.error)
                console.error('No se pudo guardar el historial de la alerta.');
        }
    }
    catch {
        console.error('No se pudieron evaluar las alertas financieras.');
    }
}
