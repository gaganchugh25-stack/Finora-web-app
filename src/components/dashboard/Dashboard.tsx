import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  Fuel,
  Goal,
  Landmark,
  Plus,
  ReceiptIndianRupee,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { FinanceState, Transaction } from '../../types/finance';
import { formatShortDate } from '../../lib/date';
import { getBudgetSpent, getCashFlowHistory, getDashboardSummary } from '../../lib/finance';
import { formatMoney } from '../../lib/money';
import { SummaryCard } from './SummaryCard';

const CashFlowChart = lazy(() => import('./CashFlowChart').then((module) => ({ default: module.CashFlowChart })));

interface DashboardProps {
  state: FinanceState;
  searchQuery: string;
  onAddTransaction: (type?: Transaction['type']) => void;
  onViewTransactions: () => void;
}

const transactionIcons = {
  income: BriefcaseBusiness,
  expense: ShoppingBag,
  transfer: ArrowLeftRight,
};

function TransactionRow({ transaction, accountName }: { transaction: Transaction; accountName: string }) {
  const Icon = transaction.payee.includes('Oil') ? Fuel : transactionIcons[transaction.type];
  const amountPrefix = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '';

  return (
    <li className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--border)] first:border-t-0 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
      <div className="flex min-w-0 items-center gap-3 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--muted-ink)]"><Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <strong className="block truncate text-sm">{transaction.payee}</strong>
          <span className="mt-0.5 block truncate text-xs text-[var(--muted-ink)]">{transaction.category} · {accountName}</span>
        </div>
      </div>
      <span className="hidden text-xs text-[var(--muted-ink)] sm:block">{formatShortDate(transaction.occurredOn)}</span>
      <strong className={`text-right text-sm tabular-nums ${transaction.type === 'income' ? 'text-[var(--positive)]' : transaction.type === 'expense' ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
        {amountPrefix}{formatMoney(transaction.amountMinor)}
        <span className="mt-0.5 block text-[11px] font-normal text-[var(--muted-ink)] sm:hidden">{formatShortDate(transaction.occurredOn)}</span>
      </strong>
    </li>
  );
}

export function Dashboard({ state, searchQuery, onAddTransaction, onViewTransactions }: DashboardProps) {
  const summary = getDashboardSummary(state);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const periodLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(today);
  const cashFlow = getCashFlowHistory(state.transactions, todayKey);
  const accountsById = new Map(state.accounts.map((account) => [account.id, account.name]));
  const normalisedQuery = searchQuery.trim().toLocaleLowerCase('en-IN');
  const recentTransactions = state.transactions
    .filter((transaction) => {
      if (!normalisedQuery) return true;
      return [transaction.payee, transaction.category, accountsById.get(transaction.accountId) ?? '']
        .some((value) => value.toLocaleLowerCase('en-IN').includes(normalisedQuery));
    })
    .slice(0, 5);
  const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadKey = `${weekAhead.getFullYear()}-${String(weekAhead.getMonth() + 1).padStart(2, '0')}-${String(weekAhead.getDate()).padStart(2, '0')}`;
  const activeBudgets = state.budgets.filter((budget) => budget.startOn <= todayKey && budget.endOn >= todayKey);
  const activeBudgetLimitMinor = activeBudgets.reduce((total, budget) => total + budget.limitMinor, 0);
  const activeBudgetSpentMinor = activeBudgets.reduce((total, budget) => total + getBudgetSpent(budget, state.transactions), 0);
  const budgetPercent = activeBudgetLimitMinor > 0 ? Math.round((activeBudgetSpentMinor / activeBudgetLimitMinor) * 100) : 0;
  const budgetRemainingMinor = activeBudgetLimitMinor - activeBudgetSpentMinor;
  const featuredGoal = state.savingsGoals[0];
  const goalPercent = featuredGoal ? Math.round((featuredGoal.savedMinor / featuredGoal.targetMinor) * 100) : 0;
  const upcomingBills = state.bills.filter((bill) => !bill.paidOn && bill.dueOn >= todayKey && bill.dueOn <= weekAheadKey).sort((a, b) => a.dueOn.localeCompare(b.dueOn)).slice(0, 3);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-balance text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">HI Gagan</h1>
          <p className="mt-1.5 text-sm text-[var(--muted-ink)]">Here is your financial position for {periodLabel}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="dashboard-period">Reporting period</label>
          <select id="dashboard-period" className="control min-w-[150px]" defaultValue="current"><option value="current">{periodLabel}</option></select>
          <span className="hidden sm:block"><button className="primary-button" type="button" onClick={() => onAddTransaction()}><Plus aria-hidden="true" className="size-4" />Add transaction</button></span>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={`${periodLabel} financial summary`}>
        <SummaryCard label="Available balance" value={formatMoney(summary.totalBalanceMinor)} context={`Across ${state.accounts.filter((account) => !account.archived).length} active accounts`} icon={Landmark} />
        <SummaryCard label="Income" value={formatMoney(summary.incomeMinor)} context="Salary and side income" icon={TrendingUp} />
        <SummaryCard label="Expenses" value={formatMoney(summary.expenseMinor)} context="Excludes account transfers" icon={TrendingDown} tone="danger" />
        <SummaryCard label="Monthly surplus" value={formatMoney(summary.surplusMinor)} context={`${summary.savingsRate.toFixed(1)}% savings rate`} icon={Wallet} tone="blue" />
      </section>

      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <Suspense fallback={<div className="panel min-h-[360px] animate-pulse" aria-label="Loading cash-flow chart"><div className="h-5 w-36 rounded bg-[var(--muted)]" /><div className="mt-3 h-3 w-56 rounded bg-[var(--muted)]" /><div className="mt-8 h-[240px] rounded-xl bg-[var(--muted)]" /></div>}>
          <CashFlowChart points={cashFlow} />
        </Suspense>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="panel">
            <div className="flex items-start justify-between gap-3"><div><h2 className="section-title">Active budget plan</h2><p className="section-copy">{activeBudgets.length} category budget{activeBudgets.length === 1 ? '' : 's'}</p></div><span className={`status ${budgetPercent > 100 ? 'budget-status-danger' : budgetPercent >= 80 ? 'budget-status-warning' : 'status-positive'}`}>{budgetPercent > 100 ? 'Over plan' : budgetPercent >= 80 ? 'Watch' : 'On track'}</span></div>
            <div className="mt-5 flex items-baseline justify-between gap-3"><strong className="text-xl tabular-nums">{formatMoney(activeBudgetSpentMinor)}</strong><span className="text-xs text-[var(--muted-ink)]">of {formatMoney(activeBudgetLimitMinor)}</span></div>
            <div className={`budget-progress ${budgetPercent > 100 ? 'budget-progress-danger' : budgetPercent >= 80 ? 'budget-progress-warning' : 'budget-progress-positive'} mt-4`} role="progressbar" aria-label="Active budget plan used" aria-valuenow={Math.min(budgetPercent, 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(budgetPercent, 100)}%` }} /></div>
            <div className="mt-2 flex justify-between gap-2 text-xs text-[var(--muted-ink)]"><span>{budgetPercent}% used</span><span>{budgetRemainingMinor >= 0 ? `${formatMoney(budgetRemainingMinor)} remaining` : `${formatMoney(Math.abs(budgetRemainingMinor))} over`}</span></div>
          </article>
          <article className="panel">
            <div className="flex items-start justify-between gap-3"><div><h2 className="section-title">{featuredGoal?.name ?? 'Savings goals'}</h2><p className="section-copy">{featuredGoal ? `Target: ${formatShortDate(featuredGoal.targetDate)}` : 'Add a goal to track progress'}</p></div><Goal aria-hidden="true" className="size-5 text-[var(--info)]" /></div>
            <div className="mt-5 flex items-baseline justify-between gap-3"><strong className="text-xl tabular-nums">{formatMoney(featuredGoal?.savedMinor ?? 0)}</strong><span className="text-xs text-[var(--muted-ink)]">of {formatMoney(featuredGoal?.targetMinor ?? 0)}</span></div>
            <div className="progress-track progress-blue mt-4" role="progressbar" aria-label={`${featuredGoal?.name ?? 'Savings goal'} progress`} aria-valuenow={Math.min(goalPercent, 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(goalPercent, 100)}%` }} /></div>
            <div className="mt-2 flex justify-between gap-2 text-xs text-[var(--muted-ink)]"><span>{goalPercent}% complete</span><span>{formatMoney(Math.max(0, (featuredGoal?.targetMinor ?? 0) - (featuredGoal?.savedMinor ?? 0)))} to go</span></div>
          </article>
        </div>
      </section>

      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <article className="panel">
          <div className="mb-1 flex items-start justify-between gap-3"><div><h2 className="section-title">Recent transactions</h2><p className="section-copy">Latest activity across all accounts</p></div><button className="min-h-10 text-sm font-semibold text-[var(--primary)]" type="button" onClick={onViewTransactions}>View all</button></div>
          {recentTransactions.length > 0 ? (
            <ul>{recentTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} accountName={accountsById.get(transaction.accountId) ?? 'Unknown account'} />)}</ul>
          ) : (
            <div className="grid min-h-44 place-items-center text-center"><div><ReceiptIndianRupee aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><h3 className="mt-3 font-semibold">{normalisedQuery ? 'No matching activity' : 'No transactions yet'}</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">{normalisedQuery ? 'Try another merchant, category or account name.' : 'Add an account, then record your first income or expense.'}</p></div></div>
          )}
        </article>

        <article className="panel">
          <div className="mb-1 flex items-start justify-between gap-3"><div><h2 className="section-title">Upcoming bills</h2><p className="section-copy">Next seven days</p></div><CalendarClock aria-hidden="true" className="size-5 text-[var(--warning)]" /></div>
          {upcomingBills.length > 0 ? <ul>{upcomingBills.map((bill) => <li className="flex min-h-[70px] items-center gap-3 border-t border-[var(--border)] first:border-t-0" key={bill.id}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--soft-warning)] text-center text-xs font-bold leading-tight text-[var(--warning-strong)]">{new Date(`${bill.dueOn}T12:00:00+05:30`).getDate()}<small className="block text-[11px]">{new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${bill.dueOn}T12:00:00+05:30`)).toUpperCase()}</small></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{bill.name}</strong><span className="text-xs text-[var(--muted-ink)]">Reminder {bill.reminderDays === 0 ? 'on due date' : `${bill.reminderDays} days before`}</span></div><strong className="text-sm tabular-nums">{formatMoney(bill.amountMinor)}</strong><ChevronRight aria-hidden="true" className="size-4 text-[var(--muted-ink)]" /></li>)}</ul> : <div className="grid min-h-36 place-items-center text-center"><div><CalendarClock aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><p className="mt-2 text-sm font-semibold">No upcoming bills</p><p className="mt-1 text-xs text-[var(--muted-ink)]">New reminders will appear here.</p></div></div>}
        </article>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Quick actions">
        <button className="quick-action" type="button" onClick={() => onAddTransaction('expense')}><ArrowUpRight aria-hidden="true" />Add expense</button>
        <button className="quick-action" type="button" onClick={() => onAddTransaction('income')}><ArrowDownLeft aria-hidden="true" />Add income</button>
        <button className="quick-action" type="button" onClick={() => onAddTransaction('transfer')}><ArrowLeftRight aria-hidden="true" />Transfer funds</button>
      </section>
    </div>
  );
}
