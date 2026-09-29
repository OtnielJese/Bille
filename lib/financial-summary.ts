import { effectiveBudget, monthRange, summarize } from '@/lib/finance';
import type { SupabaseClient } from '@supabase/supabase-js';
export async function loadFinancialSummary(supabase: SupabaseClient, userId: string, month: number, year: number) {
    const { start, end } = monthRange(String(year) + '-' + String(month).padStart(2, '0') + '-01');
    const [budgetResult, categoryResult] = await Promise.all([
        supabase.from('budgets').select('*').eq('user_id', userId).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('category_budgets').select('amount').eq('user_id', userId).eq('month', month).eq('year', year),
    ]);
    if (budgetResult.error)
        throw budgetResult.error;
    if (categoryResult.error)
        throw categoryResult.error;
    const txs: {
        type: string;
        amount: number | string;
        date: string;
        category: any;
    }[] = [];
    for (let offset = 0;; offset += 1000) {
        const { data, error } = await supabase.from('transactions').select('type, amount, date, category:categories(name, icon)')
            .eq('user_id', userId).gte('date', start).lte('date', end).order('id').range(offset, offset + 999);
        if (error)
            throw error;
        txs.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000)
            break;
    }
    const total = effectiveBudget(budgetResult.data?.total, categoryResult.data ?? []);
    return { budget: budgetResult.data, ...summarize(txs, total), transactions: txs };
}
