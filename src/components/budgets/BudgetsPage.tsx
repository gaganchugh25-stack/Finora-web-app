import { AlertTriangle, CalendarRange, Gauge, IndianRupee, Pencil, Plus, Search, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../lib/date';
import { getBudgetProgress } from '../../lib/finance';
import { formatMoney } from '../../lib/money';
import type { Budget, FinanceState, MoneyMinor } from '../../types/finance';

interface BudgetsPageProps {
  state: FinanceState;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function monthBounds(date: string): { startOn: string; endOn: string; label: string } {
  const [year, month] = date.split('-').map(Number);
  const end = new Date(year, month, 0).getDate();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return {
    startOn: `${monthKey}-01`,
    endOn: `${monthKey}-${String(end).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(`${monthKey}-15T12:00:00+05:30`)),
  };
}

export function BudgetsPage({ state, searchQuery, onSearchChange, onAdd, onEdit, onDelete }: BudgetsPageProps) {
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const today = localDate();
  const month = monthBounds(today);
  const activeBudgets = state.budgets.filter((budget) => budget.startOn <= today && budget.endOn >= today);
  const displayedBase = scope === 'active' ? activeBudgets : state.budgets;
  const query = searchQuery.trim().toLocaleLowerCase('en-IN');
  const displayed = displayedBase.filter((budget) => !query || [budget.name, budget.category, budget.period].some((value) => value.toLocaleLowerCase('en-IN').includes(query)));
  const activeProgress = activeBudgets.map((budget) => ({ budget, progress: getBudgetProgress(budget, state.transactions) }));
  const plannedMinor = activeBudgets.reduce((total, budget) => total + budget.limitMinor, 0);
  const spentMinor = activeProgress.reduce((total, item) => total + item.progress.spentMinor, 0);
  const remainingMinor = plannedMinor - spentMinor;
  const attentionCount = activeProgress.filter((item) => item.progress.tone !== 'positive').length;
  const budgetedCategories = new Set(state.budgets.filter((budget) => budget.startOn <= month.endOn && budget.endOn >= month.startOn).map((budget) => budget.category.toLocaleLowerCase('en-IN')));
  const unbudgetedByCategory = state.transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.occurredOn >= month.startOn && transaction.occurredOn <= month.endOn && !budgetedCategories.has(transaction.category.toLocaleLowerCase('en-IN')))
    .reduce((totals, transaction) => totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amountMinor), new Map<string, MoneyMinor>());
  const unbudgeted = Array.from(unbudgetedByCategory, ([category, amountMinor]) => ({ category, amountMinor })).sort((a, b) => b.amountMinor - a.amountMinor);
  const ranked = [...activeProgress].sort((a, b) => b.progress.usedPercent - a.progress.usedPercent);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[var(--primary)]">Spending plan</p><h1 className="mt-1 text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">Budgets</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">Set category limits and see exactly where spending needs attention.</p></div><button className="primary-button self-start" type="button" onClick={onAdd}><Plus aria-hidden="true" className="size-4" />Add budget</button></div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Active budget summary">
        <Summary label="Active plan" value={formatMoney(plannedMinor)} context={`${activeBudgets.length} budget${activeBudgets.length === 1 ? '' : 's'} active today`} icon={WalletCards} />
        <Summary label="Spent" value={formatMoney(spentMinor)} context={plannedMinor > 0 ? `${Math.round((spentMinor / plannedMinor) * 100)}% of the active plan` : 'No active budget plan'} icon={IndianRupee} tone="blue" />
        <Summary label={remainingMinor >= 0 ? 'Remaining' : 'Over plan'} value={formatMoney(Math.abs(remainingMinor))} context={remainingMinor >= 0 ? 'Available across active budgets' : 'Reduce spending or revise limits'} icon={remainingMinor >= 0 ? ShieldCheck : AlertTriangle} tone={remainingMinor >= 0 ? undefined : 'danger'} />
        <Summary label="Needs attention" value={String(attentionCount)} context="Near limit or over budget" icon={Gauge} tone={attentionCount > 0 ? 'warning' : undefined} />
      </section>

      <section className="panel mt-4" aria-labelledby="budget-list-title">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 id="budget-list-title" className="section-title">Your category budgets</h2><p className="section-copy">Spent amounts use expense category and transaction date.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="grid grid-cols-2 rounded-xl bg-[var(--muted)] p-1" aria-label="Budget scope"><button className={`min-h-10 rounded-lg px-3 text-sm font-bold ${scope === 'active' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-pressed={scope === 'active'} onClick={() => setScope('active')}>Active</button><button className={`min-h-10 rounded-lg px-3 text-sm font-bold ${scope === 'all' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All budgets</button></div><label className="control flex min-w-0 items-center gap-2 sm:w-64"><Search aria-hidden="true" className="size-4 text-[var(--muted-ink)]" /><span className="sr-only">Search budgets</span><input className="min-w-0 flex-1 bg-transparent outline-none" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search budgets" /></label></div></div>

        {displayed.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{displayed.map((budget) => <BudgetCard key={budget.id} budget={budget} state={state} today={today} onEdit={() => onEdit(budget)} onDelete={() => onDelete(budget)} />)}</div> : <div className="grid min-h-56 place-items-center text-center"><div><WalletCards aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" /><h3 className="mt-3 font-semibold">{query ? 'No matching budgets' : scope === 'active' ? 'No active budgets' : 'No budgets yet'}</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">{query ? 'Try another name or category.' : 'Create a monthly or custom budget to start planning.'}</p><button className="primary-button mt-4" type="button" onClick={query ? () => onSearchChange('') : onAdd}>{query ? 'Clear search' : 'Add budget'}</button></div></div>}
      </section>

      <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
        <article className="panel"><div><h2 className="section-title">Spending pressure</h2><p className="section-copy">Active budgets ranked by the share already used.</p></div>{ranked.length > 0 ? <ul className="mt-5 grid gap-5">{ranked.map(({ budget, progress }) => <li key={budget.id}><div className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-semibold">{budget.category}</span><span className={`shrink-0 font-bold tabular-nums ${progress.tone === 'danger' ? 'text-[var(--danger-strong)]' : progress.tone === 'warning' ? 'text-[var(--warning-strong)]' : 'text-[var(--positive-strong)]'}`}>{Math.round(progress.usedPercent)}%</span></div><div className={`budget-progress budget-progress-${progress.tone} mt-2`} role="progressbar" aria-label={`${budget.category} budget used`} aria-valuenow={Math.min(Math.round(progress.usedPercent), 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(progress.usedPercent, 100)}%` }} /></div><div className="mt-1.5 flex justify-between gap-3 text-xs text-[var(--muted-ink)]"><span>{formatMoney(progress.spentMinor)} spent</span><span>{formatMoney(budget.limitMinor)} limit</span></div></li>)}</ul> : <EmptyMini title="No active budgets" copy="Your active budget comparison will appear here." />}</article>

        <article className="panel"><div className="flex items-start justify-between gap-3"><div><h2 className="section-title">Unbudgeted this month</h2><p className="section-copy">{month.label} expenses without a category budget.</p></div><CalendarRange aria-hidden="true" className="size-5 text-[var(--warning)]" /></div>{unbudgeted.length > 0 ? <ul className="mt-3 divide-y divide-[var(--border)]">{unbudgeted.map((item) => <li key={item.category} className="flex min-h-[58px] items-center justify-between gap-3"><span className="text-sm font-semibold">{item.category}</span><strong className="text-sm tabular-nums">{formatMoney(item.amountMinor)}</strong></li>)}</ul> : <EmptyMini title="Everything is covered" copy="Every expense category this month has a budget." />}</article>
      </section>
    </div>
  );
}

function Summary({ label, value, context, icon: Icon, tone }: { label: string; value: string; context: string; icon: typeof WalletCards; tone?: 'blue' | 'warning' | 'danger' }) {
  const iconTone = tone === 'danger' ? 'bg-[var(--soft-danger)] text-[var(--danger-strong)]' : tone === 'warning' ? 'bg-[var(--soft-warning)] text-[var(--warning-strong)]' : tone === 'blue' ? 'bg-[var(--soft-blue)] text-[var(--info-strong)]' : 'bg-[var(--soft-primary)] text-[var(--positive-strong)]';
  return <article className="summary-card"><div className="flex items-start justify-between gap-2"><p className="text-xs text-[var(--muted-ink)] sm:text-sm">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${iconTone}`}><Icon aria-hidden="true" className="size-[18px]" /></span></div><strong className="mt-5 block text-[clamp(1.15rem,2.5vw,1.65rem)] tracking-[-0.035em] tabular-nums">{value}</strong><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{context}</p></article>;
}

function BudgetCard({ budget, state, today, onEdit, onDelete }: { budget: Budget; state: FinanceState; today: string; onEdit: () => void; onDelete: () => void }) {
  const progress = getBudgetProgress(budget, state.transactions);
  const active = budget.startOn <= today && budget.endOn >= today;
  const upcoming = budget.startOn > today;
  const periodLabel = budget.period === 'monthly' ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(`${budget.startOn}T12:00:00+05:30`)) : `${formatDate(budget.startOn)} – ${formatDate(budget.endOn)}`;
  return <article className="budget-card"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`status budget-status-${active ? progress.tone : 'inactive'}`}>{active ? progress.status : upcoming ? 'Upcoming' : 'Ended'}</span><span className="text-xs font-semibold text-[var(--muted-ink)]">{budget.period === 'monthly' ? 'Monthly' : 'Custom'}</span></div><h3 className="mt-3 truncate font-bold">{budget.name}</h3><p className="mt-1 text-xs text-[var(--muted-ink)]">{budget.category} · {periodLabel}</p></div><div className="flex shrink-0 gap-1"><button className="row-action" type="button" aria-label={`Edit ${budget.name}`} onClick={onEdit}><Pencil aria-hidden="true" /></button><button className="row-action hover:!bg-[var(--soft-danger)] hover:!text-[var(--danger-strong)]" type="button" aria-label={`Delete ${budget.name}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button></div></div><div className="mt-5 flex items-end justify-between gap-3"><div><span className="text-xs text-[var(--muted-ink)]">Spent</span><strong className="mt-1 block text-xl tracking-[-0.03em] tabular-nums">{formatMoney(progress.spentMinor)}</strong></div><span className="text-right text-xs leading-5 text-[var(--muted-ink)]">of<br /><strong className="text-sm text-[var(--ink)] tabular-nums">{formatMoney(budget.limitMinor)}</strong></span></div><div className={`budget-progress budget-progress-${progress.tone} mt-4`} role="progressbar" aria-label={`${budget.name} used`} aria-valuenow={Math.min(Math.round(progress.usedPercent), 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(progress.usedPercent, 100)}%` }} /></div><div className="mt-2 flex items-start justify-between gap-3 text-xs"><span className="text-[var(--muted-ink)]">{Math.round(progress.usedPercent)}% used</span><strong className={progress.remainingMinor < 0 ? 'text-[var(--danger-strong)]' : 'text-[var(--positive-strong)]'}>{progress.remainingMinor < 0 ? `${formatMoney(Math.abs(progress.remainingMinor))} over` : `${formatMoney(progress.remainingMinor)} left`}</strong></div></article>;
}

function EmptyMini({ title, copy }: { title: string; copy: string }) { return <div className="grid min-h-44 place-items-center text-center"><div><ShieldCheck aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{copy}</p></div></div>; }
