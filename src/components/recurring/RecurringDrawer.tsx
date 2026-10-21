import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Repeat2, X } from 'lucide-react';
import { getTodayKey } from '../../lib/date';
import { parseMoneyToMinor } from '../../lib/money';
import type { FinanceState, RecurringFrequency, RecurringTransaction, RecurringTransactionInput } from '../../types/finance';

interface Props {
  open: boolean;
  state: FinanceState;
  schedule?: RecurringTransaction | null;
  onClose: () => void;
  onSubmit: (input: RecurringTransactionInput) => void;
}

type Errors = Partial<Record<'payee' | 'amount' | 'accountId' | 'category' | 'nextDueOn', string>>;
const expenseCategories = ['Groceries', 'Housing', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Health', 'Insurance', 'Other'];
const incomeCategories = ['Salary', 'Side income', 'Interest', 'Refund', 'Other'];

export function RecurringDrawer({ open, state, schedule, onClose, onSubmit }: Props) {
  const activeAccounts = state.accounts.filter((account) => !account.archived || account.id === schedule?.accountId);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '');
  const [category, setCategory] = useState(expenseCategories[0]);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDueOn, setNextDueOn] = useState(getTodayKey);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const payeeRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const initial = schedule ? {
    type: schedule.type, payee: schedule.payee, amount: (schedule.amountMinor / 100).toFixed(2), accountId: schedule.accountId,
    category: schedule.category, frequency: schedule.frequency, nextDueOn: schedule.nextDueOn, note: schedule.note ?? '',
  } : { type: 'expense' as const, payee: '', amount: '', accountId: activeAccounts[0]?.id ?? '', category: expenseCategories[0], frequency: 'monthly' as const, nextDueOn: getTodayKey(), note: '' };
  const dirty = type !== initial.type || payee !== initial.payee || amount !== initial.amount || accountId !== initial.accountId || category !== initial.category || frequency !== initial.frequency || nextDueOn !== initial.nextDueOn || note !== initial.note;

  useEffect(() => {
    if (!open) return;
    setType(initial.type); setPayee(initial.payee); setAmount(initial.amount); setAccountId(initial.accountId); setCategory(initial.category);
    setFrequency(initial.frequency); setNextDueOn(initial.nextDueOn); setNote(initial.note); setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => payeeRef.current?.focus(), 50);
  }, [open, schedule]);

  useEffect(() => { if (submitted && Object.keys(errors).length) summaryRef.current?.focus(); }, [errors, submitted]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') confirmClose ? setConfirmClose(false) : dirty ? setConfirmClose(true) : onClose(); };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [open, confirmClose, dirty, onClose]);
  if (!open) return null;

  const categories = type === 'expense' ? expenseCategories : incomeCategories;
  const validate = () => {
    const next: Errors = {}; const amountMinor = parseMoneyToMinor(amount);
    if (!payee.trim()) next.payee = type === 'income' ? 'Enter an income source.' : 'Enter a payee.';
    if (!amountMinor) next.amount = 'Enter an amount greater than ₹0 with up to two decimals.';
    if (!accountId) next.accountId = 'Select an active account.';
    if (!category) next.category = 'Select a category.';
    if (!nextDueOn) next.nextDueOn = 'Select the next due date.';
    return { next, amountMinor };
  };
  const close = () => dirty ? setConfirmClose(true) : onClose();
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true); const result = validate(); setErrors(result.next);
    if (!result.amountMinor || Object.keys(result.next).length) return;
    onSubmit({ type, payee: payee.trim(), amountMinor: result.amountMinor, accountId, category, frequency, nextDueOn, note: note.trim() || undefined, active: schedule?.active ?? true });
  };

  return <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="drawer-enter relative flex h-dvh w-full max-w-[470px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="recurring-form-title">
      <div className="flex items-start justify-between gap-4"><div><span className="grid size-11 place-items-center rounded-xl bg-[var(--soft-blue)] text-[var(--info-strong)]"><Repeat2 aria-hidden="true" className="size-5" /></span><h2 id="recurring-form-title" className="mt-4 text-2xl font-bold tracking-[-0.03em]">{schedule ? 'Edit recurring transaction' : 'Add recurring transaction'}</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">Create a schedule without changing balances until you record an occurrence.</p></div><button className="icon-button" type="button" aria-label="Close recurring transaction form" onClick={close}><X aria-hidden="true" /></button></div>
      <form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
        {submitted && Object.keys(errors).length > 0 && <div ref={summaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline" href={`#recurring-${field}`}>{message}</a></li>)}</ul></div></div></div>}
        <fieldset><legend className="field-label">Transaction type</legend><div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-[var(--muted)] p-1">{(['expense', 'income'] as const).map((value) => <button key={value} className={`min-h-11 rounded-lg text-sm font-bold capitalize ${type === value ? 'bg-[var(--surface)] shadow-sm' : 'text-[var(--muted-ink)]'}`} type="button" aria-pressed={type === value} onClick={() => { setType(value); setCategory((value === 'expense' ? expenseCategories : incomeCategories)[0]); }}>{value}</button>)}</div></fieldset>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label={type === 'income' ? 'Income source' : 'Payee'} id="recurring-payee" error={errors.payee}><input ref={payeeRef} id="recurring-payee" className="control" value={payee} onChange={(event) => setPayee(event.target.value)} /></Field><Field label="Amount" id="recurring-amount" error={errors.amount}><input id="recurring-amount" className="control" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></Field></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Account" id="recurring-accountId" error={errors.accountId}><select id="recurring-accountId" className="control" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Select account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field><Field label="Category" id="recurring-category" error={errors.category}><select id="recurring-category" className="control" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></Field></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Frequency" id="recurring-frequency"><select id="recurring-frequency" className="control" value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></Field><Field label="Next due date" id="recurring-nextDueOn" error={errors.nextDueOn}><input id="recurring-nextDueOn" className="control" type="date" value={nextDueOn} onChange={(event) => setNextDueOn(event.target.value)} /></Field></div>
        <Field label="Note (optional)" id="recurring-note" className="mt-4"><textarea id="recurring-note" className="control min-h-24 resize-y py-3" value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        <div className="mt-auto flex justify-end gap-2 border-t border-[var(--border)] pt-5"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button" type="submit">{schedule ? 'Save changes' : 'Add schedule'}</button></div>
      </form>
      {confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/45 p-4"><section className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]" role="alertdialog" aria-modal="true" aria-labelledby="discard-recurring-title"><h3 id="discard-recurring-title" className="text-lg font-bold">Discard this schedule?</h3><p className="mt-2 text-sm text-[var(--muted-ink)]">Your recurring transaction details will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></section></div>}
    </section>
  </div>;
}

function Field({ label, id, error, className = '', children }: { label: string; id: string; error?: string; className?: string; children: React.ReactNode }) {
  return <div className={`field-group ${className}`}><label className="field-label" htmlFor={id}>{label}</label>{children}{error && <p className="field-error" role="alert">{error}</p>}</div>;
}
