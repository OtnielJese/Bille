/** Financial dates use Peru time, independently of the server's timezone. */
export function peruToday(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    return [part('year'), part('month'), part('day')].join('-');
}
export function isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftDate(value: string, days: number): string {
    const date = new Date(value + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
export function monthRange(today = peruToday()) {
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const end = new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10);
    return { year, month, start: today.slice(0, 7) + '-01', end };
}
export function periodRange(period: string, today = peruToday()) {
    if (period === 'mensual')
        return monthRange(today);
    if (period === 'quincenal') {
        const second = Number(today.slice(8)) > 15;
        return { start: today.slice(0, 7) + (second ? '-16' : '-01'), end: second ? monthRange(today).end : today.slice(0, 7) + '-15' };
    }
    if (period === 'semanal') {
        const day = new Date(today + 'T12:00:00Z').getUTCDay();
        const start = shiftDate(today, -((day + 6) % 7));
        return { start, end: shiftDate(start, 6) };
    }
    return { start: today, end: today };
}
export function sumMoney(values: Array<number | string>): number {
    return values.reduce<number>((sum, value) => sum + Math.round(Number(value) * 100), 0) / 100;
}
export function effectiveBudget(total: unknown, categories: {
    amount: number | string;
}[] = []): number {
    const configured = Number(total ?? 0);
    return configured > 0 ? configured : sumMoney(categories.map(c => c.amount));
}
export function summarize(txs: {
    type: string;
    amount: number | string;
}[], total = 0) {
    const sum = (type: string) => sumMoney(txs.filter(t => t.type === type).map(t => t.amount));
    const spent = sum('egreso'), income = sum('ingreso'), savings = sum('ahorro');
    return { spent, income, savings, remaining: sumMoney([income, -spent]), total_budget: total,
        budget_remaining: total > 0 ? sumMoney([total, -spent]) : null,
        pct_used: total > 0 ? Math.round(spent / total * 100) : 0 };
}
export function resolveTransactionDate(message: string, today = peruToday()): string {
    if (!isValidDate(today))
        today = peruToday();
    const iso = message.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    const dmy = message.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
    const parts = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : null;
    if (parts) {
        const value = parts.map(p => p.padStart(2, '0')).join('-');
        if (!isValidDate(value))
            throw new Error('La fecha indicada no existe. Usa una fecha válida.');
        return value;
    }
    if (/\banteayer\b/i.test(message))
        return shiftDate(today, -2);
    if (/\bayer\b/i.test(message))
        return shiftDate(today, -1);
    return today;
}
