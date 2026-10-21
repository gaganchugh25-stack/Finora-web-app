import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarRange, Repeat2, X } from 'lucide-react';
import { parseMoneyToMinor } from '../../lib/money';
import type { Budget, BudgetInput, BudgetPeriod, FinanceState } from '../../types/finance';

interface BudgetDrawerProps {
  open: boolean;
  state: FinanceState;
  budget?: Budget | null;
  onClose: () => void;
  onSubmit: (input: BudgetInput) => void;
}

type Errors = Partial<Record<'name' | 'category' | 'limit' | 'month' | 'startOn' | 'endOn' | 'period', string>>;

function monthRange(month: string): { startOn: string; endOn: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { startOn: `${month}-01`, endOn: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function BudgetDrawer({ open, state, budget, onClose, onSubmit }: BudgetDrawerProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [month, setMonth] = useState(currentMonth);
  const [startOn, setStartOn] = useState('');
  const [endOn, setEndOn] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const editing = Boolean(budget);
  const categories = Array.from(new Set(state.transactions.filter((transaction) => transaction.type === 'expense').map((transaction) => transaction.category))).sort((a, b) => a.localeCompare(b, 'en-IN'));
  const initialMonth = budget?.startOn.slice(0, 7) ?? currentMonth();
  const dirty = budget
    ? name !== budget.name || category !== budget.category || limit !== (budget.limitMinor / 100).toFixed(2) || period !== budget.period || startOn !== budget.startOn || endOn !== budget.endOn
    : Boolean(name || category || limit || period !== 'monthly' || month !== currentMonth() || startOn || endOn);

  useEffect(() => {
    if (!open) return;
    setName(budget?.name ?? '');
    setCategory(budget?.category ?? '');
    setLimit(budget ? (budget.limitMinor / 100).toFixed(2) : '');
    setPeriod(budget?.period ?? 'monthly');
    setMonth(initialMonth);
    setStartOn(budget?.startOn ?? '');
    setEndOn(budget?.endOn ?? '');
    setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, budget, initialMonth]);

  useEffect(() => { if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus(); }, [errors, submitted]);

  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmClose) setConfirmClose(false); else if (dirty) setConfirmClose(true); else onClose();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [open, confirmClose, dirty, onClose]);

  if (!open) return null;

  const resolvedRange = period === 'monthly' ? monthRange(month) : { startOn, endOn };
  const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const validate = (): { next: Errors; amountMinor: number | null } => {
    const next: Errors = {};
    const amountMinor = parseMoneyToMinor(limit);
    if (!name.trim()) next.name = 'Enter a clear budget name.';
    if (!category) next.category = 'Select the expense category this budget controls.';
    if (amountMinor === null) next.limit = 'Enter a budget amount greater than zero.';
    if (period === 'monthly' && !/^\d{4}-\d{2}$/.test(month)) next.month = 'Select a valid month.';
    if (period === 'custom') {
      if (!startOn) next.startOn = 'Select a start date.';
      if (!endOn) next.endOn = 'Select an end date.';
      if (startOn && endOn && startOn > endOn) next.endOn = 'End date must be on or after the start date.';
    }
    if (category && resolvedRange.startOn && resolvedRange.endOn) {
      const normalisedCategory = category.toLocaleLowerCase('en-IN');
      const overlaps = state.budgets.some((item) => item.id !== budget?.id
        && item.category.toLocaleLowerCase('en-IN') === normalisedCategory
        && resolvedRange.startOn <= item.endOn
        && resolvedRange.endOn >= item.startOn);
      if (overlaps) next.period = 'This category already has a budget covering part of the selected period.';
    }
    return { next, amountMinor };
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    const result = validate(); setErrors(result.next);
    if (result.amountMinor === null || Object.keys(result.next).length > 0) return;
    onSubmit({ name: name.trim(), category, limitMinor: result.amountMinor, period, ...resolvedRange });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="drawer-enter relative flex h-dvh w-full max-w-[500px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="budget-form-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="budget-form-title" className="text-2xl font-bold tracking-[-0.03em]">{editing ? 'Edit budget' : 'Add budget'}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">Set a spending limit for one category and period.</p></div><button className="icon-button" type="button" aria-label={`Close ${editing ? 'edit' : 'add'} budget`} onClick={close}><X aria-hidden="true" /></button></div>

        <form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
          {submitted && Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#budget-${field}`}>{message}</a></li>)}</ul></div></div></div>}

          <div className="grid gap-4">
            <div className="field-group"><label className="field-label" htmlFor="budget-name">Budget name</label><input ref={nameRef} id="budget-name" className="control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Monthly groceries" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'budget-name-error' : undefined} />{errors.name && <p id="budget-name-error" className="field-error">{errors.name}</p>}</div>
            <div className="field-group"><label className="field-label" htmlFor="budget-category">Expense category</label><select id="budget-category" className="control" value={category} onChange={(event) => setCategory(event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'budget-category-error' : 'budget-category-help'}><option value="">Select category</option>{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select><p id="budget-category-help" className="text-xs leading-5 text-[var(--muted-ink)]">Only expenses in this category count towards the budget.</p>{errors.category && <p id="budget-category-error" className="field-error">{errors.category}</p>}</div>
            <div className="field-group"><label className="field-label" htmlFor="budget-limit">Budget amount</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input id="budget-limit" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.limit)} aria-describedby={errors.limit ? 'budget-limit-error' : undefined} /></div>{errors.limit && <p id="budget-limit-error" className="field-error">{errors.limit}</p>}</div>
          </div>

          <fieldset className="mt-5"><legend className="field-label">Budget period</legend><div className="mt-2 grid grid-cols-2 gap-2">{([{ value: 'monthly', label: 'Monthly', copy: 'One calendar month', Icon: Repeat2 }, { value: 'custom', label: 'Custom', copy: 'Choose exact dates', Icon: CalendarRange }] as const).map(({ value, label, copy, Icon }) => <label key={value} className={`flex min-h-[70px] cursor-pointer items-center gap-3 rounded-xl border p-3 ${period === value ? 'border-[var(--primary)] bg-[var(--soft-primary)] text-[var(--primary-strong)]' : 'border-[var(--border)]'}`}><input className="sr-only" type="radio" name="budget-period" value={value} checked={period === value} onChange={() => setPeriod(value)} /><Icon aria-hidden="true" className="size-5 shrink-0" /><span><strong className="block text-sm">{label}</strong><span className="mt-0.5 block text-xs text-[var(--muted-ink)]">{copy}</span></span></label>)}</div></fieldset>

          {period === 'monthly' ? <div className="field-group mt-4"><label className="field-label" htmlFor="budget-month">Budget month</label><input id="budget-month" className="control" type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-invalid={Boolean(errors.month || errors.period)} aria-describedby={`${errors.month ? 'budget-month-error ' : ''}${errors.period ? 'budget-period-error' : ''}`.trim() || undefined} />{errors.month && <p id="budget-month-error" className="field-error">{errors.month}</p>}{errors.period && <p id="budget-period-error" className="field-error">{errors.period}</p>}</div> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="field-group"><label className="field-label" htmlFor="budget-startOn">Start date</label><input id="budget-startOn" className="control" type="date" value={startOn} onChange={(event) => setStartOn(event.target.value)} aria-invalid={Boolean(errors.startOn || errors.period)} aria-describedby={`${errors.startOn ? 'budget-startOn-error ' : ''}${errors.period ? 'budget-period-error' : ''}`.trim() || undefined} />{errors.startOn && <p id="budget-startOn-error" className="field-error">{errors.startOn}</p>}</div><div className="field-group"><label className="field-label" htmlFor="budget-endOn">End date</label><input id="budget-endOn" className="control" type="date" value={endOn} min={startOn || undefined} onChange={(event) => setEndOn(event.target.value)} aria-invalid={Boolean(errors.endOn || errors.period)} aria-describedby={`${errors.endOn ? 'budget-endOn-error ' : ''}${errors.period ? 'budget-period-error' : ''}`.trim() || undefined} />{errors.endOn && <p id="budget-endOn-error" className="field-error">{errors.endOn}</p>}</div>{errors.period && <p id="budget-period-error" className="field-error sm:col-span-2">{errors.period}</p>}</div>}

          <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{editing ? 'Save changes' : 'Add budget'}</button></div>
        </form>

        {confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-budget-title" aria-describedby="discard-budget-description"><div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-budget-title" className="text-lg font-bold">Discard {editing ? 'changes' : 'this budget'}?</h3><p id="discard-budget-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Your budget details will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></div></div>}
      </section>
    </div>
  );
}
