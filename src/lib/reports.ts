import type { FinanceState, MoneyMinor, Transaction } from '../types/finance';

export type ReportPeriod = 'month' | 'quarter' | 'year' | 'all';

export interface ReportBreakdownItem { name: string; amountMinor: MoneyMinor; count: number; percent: number; }
export interface ReportTrendPoint { key: string; label: string; incomeMinor: MoneyMinor; expenseMinor: MoneyMinor; netMinor: MoneyMinor; }
export interface ReportAccountItem { id: string; name: string; moneyInMinor: MoneyMinor; moneyOutMinor: MoneyMinor; transferMinor: MoneyMinor; netMinor: MoneyMinor; count: number; }
export interface ReportAnalytics {
  period: ReportPeriod;
  startOn: string;
  endOn: string;
  transactionCount: number;
  incomeMinor: MoneyMinor;
  expenseMinor: MoneyMinor;
  transferMinor: MoneyMinor;
  netMinor: MoneyMinor;
  savingsRate: number;
  previousIncomeMinor: MoneyMinor;
  previousExpenseMinor: MoneyMinor;
  previousNetMinor: MoneyMinor;
  categories: ReportBreakdownItem[];
  incomeSources: ReportBreakdownItem[];
  accounts: ReportAccountItem[];
  trend: ReportTrendPoint[];
  largestExpense?: Transaction;
  highestSpendDay?: { date: string; amountMinor: MoneyMinor };
}

function parseKey(value: string): Date { return new Date(`${value}T12:00:00Z`); }
function toKey(value: Date): string { return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`; }
function monthStart(value: Date): Date { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 12)); }
function addDays(value: Date, days: number): Date { const next = new Date(value); next.setUTCDate(next.getUTCDate() + days); return next; }
function addMonths(value: Date, months: number): Date { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1, 12)); }

export function getReportRange(period: ReportPeriod, referenceKey: string, transactions: Transaction[]): { startOn: string; endOn: string; previousStartOn: string; previousEndOn: string } {
  const reference = parseKey(referenceKey);
  let start = monthStart(reference);
  let end = reference;
  if (period === 'quarter') start = addMonths(monthStart(reference), -2);
  if (period === 'year') start = new Date(Date.UTC(reference.getUTCFullYear(), 0, 1, 12));
  if (period === 'all') {
    const earliest = transactions.map((transaction) => transaction.occurredOn).sort()[0];
    start = earliest ? parseKey(earliest) : reference;
  }
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(durationDays - 1));
  return { startOn: toKey(start), endOn: toKey(end), previousStartOn: toKey(previousStart), previousEndOn: toKey(previousEnd) };
}

function sumByType(transactions: Transaction[], type: Transaction['type']): MoneyMinor {
  return transactions.filter((transaction) => transaction.type === type).reduce((sum, transaction) => sum + transaction.amountMinor, 0);
}

function breakdown(transactions: Transaction[], type: 'income' | 'expense'): ReportBreakdownItem[] {
  const totals = new Map<string, { amountMinor: number; count: number }>();
  transactions.filter((transaction) => transaction.type === type).forEach((transaction) => {
    const current = totals.get(transaction.category) ?? { amountMinor: 0, count: 0 };
    totals.set(transaction.category, { amountMinor: current.amountMinor + transaction.amountMinor, count: current.count + 1 });
  });
  const total = Array.from(totals.values()).reduce((sum, item) => sum + item.amountMinor, 0);
  return Array.from(totals, ([name, item]) => ({ name, ...item, percent: total > 0 ? (item.amountMinor / total) * 100 : 0 })).sort((a, b) => b.amountMinor - a.amountMinor || a.name.localeCompare(b.name, 'en-IN'));
}

function buildTrend(transactions: Transaction[], period: ReportPeriod, startOn: string, endOn: string): ReportTrendPoint[] {
  if (period === 'month') {
    const start = parseKey(startOn); const end = parseKey(endOn); const points: ReportTrendPoint[] = [];
    for (let index = 0; index < 5; index += 1) {
      const bucketStart = addDays(start, index * 7);
      if (bucketStart > end) break;
      const naturalEnd = addDays(bucketStart, 6); const bucketEnd = naturalEnd < end ? naturalEnd : end;
      const from = toKey(bucketStart); const to = toKey(bucketEnd);
      const items = transactions.filter((transaction) => transaction.occurredOn >= from && transaction.occurredOn <= to);
      const incomeMinor = sumByType(items, 'income'); const expenseMinor = sumByType(items, 'expense');
      points.push({ key: from, label: `${bucketStart.getUTCDate()}–${bucketEnd.getUTCDate()}`, incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor });
    }
    return points;
  }
  const points: ReportTrendPoint[] = []; let cursor = monthStart(parseKey(startOn)); const end = parseKey(endOn);
  while (cursor <= end && points.length < 36) {
    const key = toKey(cursor).slice(0, 7); const items = transactions.filter((transaction) => transaction.occurredOn.startsWith(key));
    const incomeMinor = sumByType(items, 'income'); const expenseMinor = sumByType(items, 'expense');
    points.push({ key, label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: period === 'all' ? '2-digit' : undefined, timeZone: 'Asia/Kolkata' }).format(new Date(`${key}-15T12:00:00+05:30`)), incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor });
    cursor = addMonths(cursor, 1);
  }
  return points;
}

export function getReportAnalytics(state: FinanceState, period: ReportPeriod, referenceKey: string): ReportAnalytics {
  const range = getReportRange(period, referenceKey, state.transactions);
  const transactions = state.transactions.filter((transaction) => transaction.occurredOn >= range.startOn && transaction.occurredOn <= range.endOn);
  const previous = period === 'all' ? [] : state.transactions.filter((transaction) => transaction.occurredOn >= range.previousStartOn && transaction.occurredOn <= range.previousEndOn);
  const incomeMinor = sumByType(transactions, 'income'); const expenseMinor = sumByType(transactions, 'expense'); const transferMinor = sumByType(transactions, 'transfer');
  const previousIncomeMinor = sumByType(previous, 'income'); const previousExpenseMinor = sumByType(previous, 'expense'); const previousNetMinor = previousIncomeMinor - previousExpenseMinor;
  const accountNames = new Map(state.accounts.map((account) => [account.id, account.name]));
  const accountIds = new Set(transactions.flatMap((transaction) => [transaction.accountId, ...(transaction.toAccountId ? [transaction.toAccountId] : [])]));
  const accounts = Array.from(accountIds).map((id): ReportAccountItem => {
    let moneyInMinor = 0; let moneyOutMinor = 0; let transferMinorForAccount = 0; let count = 0;
    transactions.forEach((transaction) => {
      if (transaction.type === 'income' && transaction.accountId === id) { moneyInMinor += transaction.amountMinor; count += 1; }
      if (transaction.type === 'expense' && transaction.accountId === id) { moneyOutMinor += transaction.amountMinor; count += 1; }
      if (transaction.type === 'transfer' && transaction.accountId === id) { moneyOutMinor += transaction.amountMinor; transferMinorForAccount += transaction.amountMinor; count += 1; }
      else if (transaction.type === 'transfer' && transaction.toAccountId === id) { moneyInMinor += transaction.amountMinor; transferMinorForAccount += transaction.amountMinor; count += 1; }
    });
    return { id, name: accountNames.get(id) ?? 'Unknown account', moneyInMinor, moneyOutMinor, transferMinor: transferMinorForAccount, netMinor: moneyInMinor - moneyOutMinor, count };
  }).sort((a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor));
  const expensesByDay = new Map<string, number>();
  transactions.filter((transaction) => transaction.type === 'expense').forEach((transaction) => expensesByDay.set(transaction.occurredOn, (expensesByDay.get(transaction.occurredOn) ?? 0) + transaction.amountMinor));
  const highestSpendDay = Array.from(expensesByDay, ([date, amountMinor]) => ({ date, amountMinor })).sort((a, b) => b.amountMinor - a.amountMinor)[0];
  return { period, startOn: range.startOn, endOn: range.endOn, transactionCount: transactions.length, incomeMinor, expenseMinor, transferMinor, netMinor: incomeMinor - expenseMinor, savingsRate: incomeMinor > 0 ? ((incomeMinor - expenseMinor) / incomeMinor) * 100 : 0, previousIncomeMinor, previousExpenseMinor, previousNetMinor, categories: breakdown(transactions, 'expense'), incomeSources: breakdown(transactions, 'income'), accounts, trend: buildTrend(transactions, period, range.startOn, range.endOn), largestExpense: transactions.filter((transaction) => transaction.type === 'expense').sort((a, b) => b.amountMinor - a.amountMinor)[0], highestSpendDay };
}

function csvCell(value: string | number): string { const text = String(value); const safe = /^[=+@-]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }
export function reportToCsv(report: ReportAnalytics): string {
  const rows: Array<Array<string | number>> = [
    ['Finora financial report'], ['Period', report.startOn, report.endOn], [],
    ['Summary', 'Amount (INR)'], ['Income', (report.incomeMinor / 100).toFixed(2)], ['Expenses', (report.expenseMinor / 100).toFixed(2)], ['Net cash flow', (report.netMinor / 100).toFixed(2)], ['Transfers', (report.transferMinor / 100).toFixed(2)], ['Savings rate', `${report.savingsRate.toFixed(1)}%`], [],
    ['Expense category', 'Amount (INR)', 'Transactions', 'Share'], ...report.categories.map((item) => [item.name, (item.amountMinor / 100).toFixed(2), item.count, `${item.percent.toFixed(1)}%`]), [],
    ['Account', 'Money in (INR)', 'Money out (INR)', 'Net movement (INR)', 'Transactions'], ...report.accounts.map((item) => [item.name, (item.moneyInMinor / 100).toFixed(2), (item.moneyOutMinor / 100).toFixed(2), (item.netMinor / 100).toFixed(2), item.count]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
