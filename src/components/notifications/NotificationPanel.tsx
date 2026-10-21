import { AlertTriangle, Bell, CalendarClock, Gauge, Repeat2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatDate, getTodayKey } from '../../lib/date';
import { getBillStatus, getBudgetProgress } from '../../lib/finance';
import { formatMoney } from '../../lib/money';
import type { FinanceState } from '../../types/finance';

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  destination: 'Bills' | 'Recurring' | 'Budgets';
  tone: 'danger' | 'warning' | 'blue';
  date: string;
}

export function getAppNotifications(state: FinanceState, today = getTodayKey()): AppNotification[] {
  const items: AppNotification[] = [];
  for (const bill of state.bills) {
    const status = getBillStatus(bill, today);
    if (bill.paidOn || status === 'upcoming') continue;
    items.push({ id: `bill-${bill.id}`, title: `${bill.name} ${status === 'overdue' ? 'is overdue' : status === 'due-today' ? 'is due today' : 'is due soon'}`, detail: `${formatMoney(bill.amountMinor)} · ${formatDate(bill.dueOn)}`, destination: 'Bills', tone: status === 'overdue' ? 'danger' : 'warning', date: bill.dueOn });
  }
  for (const item of state.recurringTransactions) {
    if (!item.active || item.nextDueOn > today) continue;
    items.push({ id: `recurring-${item.id}`, title: `${item.payee} ${item.nextDueOn < today ? 'is overdue' : 'is ready to record'}`, detail: `${formatMoney(item.amountMinor)} · ${item.frequency}`, destination: 'Recurring', tone: item.nextDueOn < today ? 'danger' : 'blue', date: item.nextDueOn });
  }
  for (const budget of state.budgets.filter((item) => item.startOn <= today && item.endOn >= today)) {
    const progress = getBudgetProgress(budget, state.transactions);
    if (progress.usedPercent < 80) continue;
    items.push({ id: `budget-${budget.id}`, title: progress.usedPercent > 100 ? `${budget.name} is over budget` : `${budget.name} is near its limit`, detail: `${Math.round(progress.usedPercent)}% used · ${formatMoney(progress.spentMinor)} spent`, destination: 'Budgets', tone: progress.usedPercent > 100 ? 'danger' : 'warning', date: today });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function NotificationPanel({ open, state, onClose, onNavigate }: { open: boolean; state: FinanceState; onClose: () => void; onNavigate: (destination: AppNotification['destination']) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [open, onClose]);
  if (!open) return null;
  const items = getAppNotifications(state);
  const iconFor = (item: AppNotification) => item.destination === 'Bills' ? CalendarClock : item.destination === 'Recurring' ? Repeat2 : Gauge;
  return <div className="fixed inset-0 z-[60] bg-[#10251b]/35 backdrop-blur-[1px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section id="notifications-panel" className="drawer-enter ml-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-[-18px_0_50px_rgba(21,42,31,0.18)]" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6"><div><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-blue)] text-[var(--info-strong)]"><Bell aria-hidden="true" className="size-5" /></span><h2 id="notifications-title" className="mt-4 text-2xl font-bold tracking-[-0.03em]">Notifications</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">{items.length ? `${items.length} item${items.length === 1 ? ' needs' : 's need'} your attention.` : 'You are all caught up.'}</p></div><button ref={closeRef} className="icon-button" type="button" aria-label="Close notifications" onClick={onClose}><X aria-hidden="true" /></button></div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">{items.length ? <ul className="grid gap-3">{items.map((item) => { const Icon = iconFor(item); return <li key={item.id}><button className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--muted)]" type="button" onClick={() => onNavigate(item.destination)}><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.tone === 'danger' ? 'bg-[var(--soft-danger)] text-[var(--danger-strong)]' : item.tone === 'warning' ? 'bg-[var(--soft-warning)] text-[var(--warning-strong)]' : 'bg-[var(--soft-blue)] text-[var(--info-strong)]'}`}><Icon aria-hidden="true" className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted-ink)]">{item.detail}</span><span className="mt-2 block text-xs font-bold text-[var(--primary)]">Review {item.destination.toLocaleLowerCase('en-IN')}</span></span></div></button></li>; })}</ul> : <div className="grid h-full place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--soft-primary)] text-[var(--positive-strong)]"><Bell aria-hidden="true" className="size-6" /></span><h3 className="mt-4 font-bold">Nothing needs attention</h3><p className="mt-1 max-w-xs text-sm leading-6 text-[var(--muted-ink)]">Upcoming bills, due recurring entries and budget warnings will appear here automatically.</p></div></div>}</div>
      {items.some((item) => item.tone === 'danger') && <div className="border-t border-[var(--border)] bg-[var(--soft-danger)] p-4 text-xs leading-5 text-[var(--danger-strong)]"><div className="flex gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>Overdue items stay visible until they are paid, recorded or rescheduled.</p></div></div>}
    </section>
  </div>;
}
