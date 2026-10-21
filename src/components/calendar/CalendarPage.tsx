import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Flag, Landmark, Plus, ReceiptText, Repeat2, Search, Target } from 'lucide-react';
import { formatDate } from '../../lib/date';
import { getCalendarEvents, getMonthGrid, getMonthKey, shiftMonth, type CalendarEvent, type CalendarEventType } from '../../lib/calendar';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import type { FinanceState } from '../../types/finance';

interface CalendarPageProps {
  state: FinanceState;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTransaction: () => void;
}

type EventGroup = 'transactions' | 'recurring' | 'budgets' | 'savings' | 'bills';

const today = (() => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; })();
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const groupTypes: Record<EventGroup, CalendarEventType[]> = { transactions: ['income', 'expense', 'transfer'], recurring: ['recurring'], budgets: ['budget'], savings: ['savings'], bills: ['bill'] };
const groupLabels: Record<EventGroup, string> = { transactions: 'Transactions', recurring: 'Recurring', budgets: 'Budgets', savings: 'Savings', bills: 'Bills' };

const fullDateFormatter = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

function parseDate(date: string): Date { return new Date(`${date}T12:00:00+05:30`); }
function monthTitle(monthKey: string): string { return monthFormatter.format(parseDate(`${monthKey}-01`)); }
function fullDate(date: string): string { return fullDateFormatter.format(parseDate(date)); }

export function CalendarPage({ state, searchQuery, onSearchChange, onAddTransaction }: CalendarPageProps) {
  const [monthKey, setMonthKey] = useState(getMonthKey);
  const [selectedDate, setSelectedDate] = useState(today);
  const [enabledGroups, setEnabledGroups] = useState<EventGroup[]>(['transactions', 'recurring', 'budgets', 'savings', 'bills']);
  const allEvents = useMemo(() => getCalendarEvents(state, state.bills), [state]);
  const query = searchQuery.trim().toLocaleLowerCase('en-IN');
  const enabledTypes = enabledGroups.flatMap((group) => groupTypes[group]);
  const filteredEvents = allEvents.filter((event) => enabledTypes.includes(event.type) && (!query || `${event.title} ${event.subtitle}`.toLocaleLowerCase('en-IN').includes(query)));
  const eventsByDate = new Map<string, CalendarEvent[]>();
  filteredEvents.forEach((event) => eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]));
  const monthEvents = allEvents.filter((event) => event.date.startsWith(monthKey));
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const grid = getMonthGrid(monthKey);
  const income = monthEvents.filter((event) => event.type === 'income').reduce((sum, event) => sum + (event.amountMinor ?? 0), 0);
  const expense = monthEvents.filter((event) => event.type === 'expense').reduce((sum, event) => sum + (event.amountMinor ?? 0), 0);
  const transfer = monthEvents.filter((event) => event.type === 'transfer').reduce((sum, event) => sum + (event.amountMinor ?? 0), 0);
  const commitments = monthEvents.filter((event) => event.type === 'bill' && event.direction === 'out').reduce((sum, event) => sum + (event.amountMinor ?? 0), 0);
  const upcoming = filteredEvents.filter((event) => event.date.startsWith(monthKey) && event.date >= today).slice(0, 6);

  const selectMonth = (nextMonth: string) => {
    setMonthKey(nextMonth);
    setSelectedDate(nextMonth === getMonthKey() ? today : `${nextMonth}-01`);
  };
  const toggleGroup = (group: EventGroup) => setEnabledGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  const selectDay = (date: string) => { setSelectedDate(date); if (!date.startsWith(monthKey)) setMonthKey(date.slice(0, 7)); };

  return <div>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[var(--primary)]">Plan & review</p><h1 className="mt-1 text-[clamp(1.65rem,3vw,2.2rem)] font-bold tracking-[-0.035em]">Financial calendar</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted-ink)]">See money movements, plan periods and important due dates in one monthly view.</p></div><button className="primary-button self-start" type="button" onClick={onAddTransaction}><Plus aria-hidden="true" className="size-4" />Add transaction</button></div>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={`${monthTitle(monthKey)} financial summary`}>
      <Summary label="Income" value={formatMoney(income)} context="Recorded this month" icon={ArrowDownLeft} tone="positive" />
      <Summary label="Expenses" value={formatMoney(expense)} context="Recorded this month" icon={ArrowUpRight} tone="danger" />
      <Summary label="Transfers" value={formatMoney(transfer)} context="Moved between accounts" icon={ArrowLeftRight} tone="blue" />
      <Summary label="Bills due" value={formatMoney(commitments)} context={`${monthEvents.filter((event) => event.type === 'bill' && event.direction === 'out').length} unpaid reminder${monthEvents.filter((event) => event.type === 'bill' && event.direction === 'out').length === 1 ? '' : 's'}`} icon={ReceiptText} tone="warning" />
    </section>

    <section className="panel mt-4" aria-labelledby="calendar-month-title">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2"><button className="icon-button" type="button" aria-label="Previous month" onClick={() => selectMonth(shiftMonth(monthKey, -1))}><ChevronLeft aria-hidden="true" /></button><div className="min-w-[160px] text-center sm:min-w-[190px]"><h2 id="calendar-month-title" className="text-lg font-bold tracking-[-0.02em]">{monthTitle(monthKey)}</h2><p className="text-xs text-[var(--muted-ink)]">{monthEvents.length} calendar item{monthEvents.length === 1 ? '' : 's'}</p></div><button className="icon-button" type="button" aria-label="Next month" onClick={() => selectMonth(shiftMonth(monthKey, 1))}><ChevronRight aria-hidden="true" /></button><button className="secondary-button ml-1 hidden sm:block" type="button" onClick={() => selectMonth(getMonthKey())}>Today</button></div>
        <label className="control flex min-w-0 items-center gap-2 xl:w-72"><Search aria-hidden="true" className="size-4 text-[var(--muted-ink)]" /><span className="sr-only">Search calendar</span><input className="min-w-0 flex-1 bg-transparent outline-none" type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search calendar" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Calendar filters"><button className="secondary-button sm:hidden" type="button" onClick={() => selectMonth(getMonthKey())}>Today</button>{(Object.keys(groupLabels) as EventGroup[]).map((group) => { const active = enabledGroups.includes(group); return <button key={group} className={`calendar-filter calendar-filter-${group} ${active ? 'calendar-filter-active' : ''}`} type="button" aria-pressed={active} onClick={() => toggleGroup(group)}><span aria-hidden="true" className="calendar-filter-dot" />{groupLabels[group]}</button>; })}</div>

      <div className="calendar-grid mt-5" role="grid" aria-label={`${monthTitle(monthKey)} calendar`}>{weekDays.map((day) => <div key={day} className="calendar-weekday" role="columnheader">{day}</div>)}{grid.map((day) => { const events = eventsByDate.get(day.date) ?? []; const isToday = day.date === today; const selected = day.date === selectedDate; return <button key={day.date} className={`calendar-day ${day.inCurrentMonth ? '' : 'calendar-day-outside'} ${selected ? 'calendar-day-selected' : ''}`} type="button" role="gridcell" aria-selected={selected} aria-label={`${fullDate(day.date)}, ${events.length} item${events.length === 1 ? '' : 's'}`} onClick={() => selectDay(day.date)}><span className={`calendar-day-number ${isToday ? 'calendar-today' : ''}`}>{day.day}</span><span className="calendar-event-list" aria-hidden="true">{events.slice(0, 2).map((event) => <span key={event.id} className={`calendar-event-pill calendar-event-${event.type}`}><span>{event.title}</span>{event.amountMinor != null && <strong>{formatMoneyCompact(event.amountMinor)}</strong>}</span>)}{events.length > 2 && <span className="calendar-more">+{events.length - 2} more</span>}</span><span className="calendar-mobile-dots" aria-hidden="true">{events.slice(0, 3).map((event) => <span key={event.id} className={`calendar-event-dot calendar-event-${event.type}`} />)}{events.length > 3 && <small>+{events.length - 3}</small>}</span></button>; })}</div>
      {enabledGroups.length === 0 && <div className="mt-4 rounded-xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-ink)]" role="status">All calendar categories are hidden. Turn on a filter to show items.</div>}
    </section>

    <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
      <article className="panel"><div className="flex items-start justify-between gap-4"><div><h2 className="section-title">{fullDate(selectedDate)}</h2><p className="section-copy">{selectedEvents.length} visible item{selectedEvents.length === 1 ? '' : 's'} for this day.</p></div><CalendarDays aria-hidden="true" className="size-5 text-[var(--primary)]" /></div>{selectedEvents.length > 0 ? <EventList events={selectedEvents} /> : <EmptyState query={query} />}</article>
      <article className="panel"><div className="flex items-start justify-between gap-4"><div><h2 className="section-title">Coming up this month</h2><p className="section-copy">Next visible deadlines and money movements.</p></div><Flag aria-hidden="true" className="size-5 text-[var(--info)]" /></div>{upcoming.length > 0 ? <EventList events={upcoming} showDate /> : <div className="grid min-h-40 place-items-center text-center"><div><Target aria-hidden="true" className="mx-auto size-7 text-[var(--muted-ink)]" /><p className="mt-3 text-sm font-semibold">Nothing else scheduled</p><p className="mt-1 text-xs text-[var(--muted-ink)]">Try another month or turn on more filters.</p></div></div>}</article>
    </section>
  </div>;
}

function Summary({ label, value, context, icon: Icon, tone }: { label: string; value: string; context: string; icon: typeof Landmark; tone: 'positive' | 'danger' | 'blue' | 'warning' }) { const tones = { positive: 'bg-[var(--soft-primary)] text-[var(--positive-strong)]', danger: 'bg-[var(--soft-danger)] text-[var(--danger-strong)]', blue: 'bg-[var(--soft-blue)] text-[var(--info-strong)]', warning: 'bg-[var(--soft-warning)] text-[var(--warning-strong)]' }; return <article className="summary-card"><div className="flex items-start justify-between gap-2"><p className="text-xs text-[var(--muted-ink)] sm:text-sm">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}><Icon aria-hidden="true" className="size-[18px]" /></span></div><strong className="mt-5 block text-[clamp(1.15rem,2.5vw,1.65rem)] tracking-[-0.035em] tabular-nums">{value}</strong><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{context}</p></article>; }

function EventList({ events, showDate = false }: { events: CalendarEvent[]; showDate?: boolean }) { return <ul className="mt-3 divide-y divide-[var(--border)]">{events.map((event) => { const Icon = event.type === 'income' ? ArrowDownLeft : event.type === 'expense' ? ArrowUpRight : event.type === 'transfer' ? ArrowLeftRight : event.type === 'budget' ? CircleDollarSign : event.type === 'savings' ? Target : event.type === 'recurring' ? Repeat2 : ReceiptText; return <li key={event.id} className="grid min-h-[68px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2"><span className={`calendar-event-icon calendar-event-${event.type}`}><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0"><strong className="block truncate text-sm">{event.title}</strong><span className="block truncate text-xs text-[var(--muted-ink)]">{showDate ? `${formatDate(event.date)} · ` : ''}{event.subtitle}</span></div>{event.amountMinor != null && <strong className={`text-sm tabular-nums ${event.direction === 'in' ? 'text-[var(--positive-strong)]' : event.direction === 'out' ? 'text-[var(--danger-strong)]' : ''}`}>{event.direction === 'in' ? '+' : event.direction === 'out' ? '−' : ''}{formatMoney(event.amountMinor)}</strong>}</li>; })}</ul>; }

function EmptyState({ query }: { query: string }) { return <div className="grid min-h-44 place-items-center text-center"><div><CalendarDays aria-hidden="true" className="mx-auto size-8 text-[var(--muted-ink)]" /><h3 className="mt-3 text-sm font-semibold">{query ? 'No matching items' : 'No items scheduled'}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{query ? 'Try another search or adjust the filters.' : 'Select another day to review its activity.'}</p></div></div>; }
