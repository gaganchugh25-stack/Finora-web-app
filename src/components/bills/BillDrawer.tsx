import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BellRing, X } from 'lucide-react';
import { parseMoneyToMinor } from '../../lib/money';
import type { BillInput, BillReminder, FinanceState } from '../../types/finance';

interface BillDrawerProps {
  open: boolean;
  state: FinanceState;
  bill?: BillReminder | null;
  onClose: () => void;
  onSubmit: (input: BillInput) => void;
}

type Errors = Partial<Record<'name' | 'amount' | 'dueOn' | 'accountId' | 'category', string>>;
const reminderOptions = [0, 1, 3, 7, 14, 30];
function todayKey(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }

export function BillDrawer({ open, state, bill, onClose, onSubmit }: BillDrawerProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueOn, setDueOn] = useState(todayKey);
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [reminderDays, setReminderDays] = useState(3);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const activeAccounts = state.accounts.filter((account) => !account.archived);
  const categories = Array.from(new Set(['Utilities', 'Housing', 'Insurance', 'Subscriptions', ...state.transactions.filter((transaction) => transaction.type === 'expense').map((transaction) => transaction.category)])).sort((a, b) => a.localeCompare(b, 'en-IN'));
  const editing = Boolean(bill);
  const initialAccount = bill?.accountId ?? activeAccounts[0]?.id ?? '';
  const dirty = bill ? name !== bill.name || amount !== (bill.amountMinor / 100).toFixed(2) || dueOn !== bill.dueOn || accountId !== bill.accountId || category !== bill.category || reminderDays !== bill.reminderDays || note !== (bill.note ?? '') : Boolean(name || amount || dueOn !== todayKey() || accountId !== initialAccount || category !== 'Utilities' || reminderDays !== 3 || note);

  useEffect(() => {
    if (!open) return;
    setName(bill?.name ?? ''); setAmount(bill ? (bill.amountMinor / 100).toFixed(2) : ''); setDueOn(bill?.dueOn ?? todayKey());
    setAccountId(initialAccount); setCategory(bill?.category ?? 'Utilities'); setReminderDays(bill?.reminderDays ?? 3); setNote(bill?.note ?? '');
    setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, bill, initialAccount]);

  useEffect(() => { if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus(); }, [errors, submitted]);
  useEffect(() => { if (!open) return; const keydown = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; if (confirmClose) setConfirmClose(false); else if (dirty) setConfirmClose(true); else onClose(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [open, confirmClose, dirty, onClose]);

  if (!open) return null;
  const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    const next: Errors = {}; const amountMinor = parseMoneyToMinor(amount);
    if (!name.trim()) next.name = 'Enter a clear bill name.';
    if (amountMinor === null) next.amount = 'Enter an amount greater than zero with up to two decimal places.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) next.dueOn = 'Select a valid due date.';
    if (!activeAccounts.some((account) => account.id === accountId)) next.accountId = 'Select an active payment account.';
    if (!category.trim()) next.category = 'Select or enter a spending category.';
    setErrors(next); if (amountMinor === null || Object.keys(next).length > 0) return;
    onSubmit({ name: name.trim(), amountMinor, dueOn, accountId, category: category.trim(), reminderDays, note: note.trim() || undefined });
  };

  return <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="drawer-enter relative flex h-dvh w-full max-w-[470px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="bill-form-title">
      <div className="flex items-start justify-between gap-4"><div><h2 id="bill-form-title" className="text-2xl font-bold tracking-[-0.03em]">{editing ? 'Edit bill' : 'Add bill'}</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">{editing ? 'Update the due date, reminder and payment details.' : 'Plan a payment and receive a clear due-date reminder.'}</p></div><button className="icon-button" type="button" aria-label={`Close ${editing ? 'edit' : 'add'} bill`} onClick={close}><X aria-hidden="true" /></button></div>
      <form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
        {submitted && Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#bill-${field}`}>{message}</a></li>)}</ul></div></div></div>}
        <div className="grid gap-4">
          <div className="field-group"><label className="field-label" htmlFor="bill-name">Bill name</label><input ref={nameRef} id="bill-name" className="control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Electricity" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'bill-name-error' : undefined} />{errors.name && <p id="bill-name-error" className="field-error">{errors.name}</p>}</div>
          <div className="field-group"><label className="field-label" htmlFor="bill-amount">Amount</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input id="bill-amount" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'bill-amount-error' : undefined} /></div>{errors.amount && <p id="bill-amount-error" className="field-error">{errors.amount}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="field-group"><label className="field-label" htmlFor="bill-dueOn">Due date</label><input id="bill-dueOn" className="control" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} aria-invalid={Boolean(errors.dueOn)} aria-describedby={errors.dueOn ? 'bill-dueOn-error' : undefined} />{errors.dueOn && <p id="bill-dueOn-error" className="field-error">{errors.dueOn}</p>}</div><div className="field-group"><label className="field-label" htmlFor="bill-reminder">Remind me</label><select id="bill-reminder" className="control" value={reminderDays} onChange={(event) => setReminderDays(Number(event.target.value))}>{reminderOptions.map((days) => <option key={days} value={days}>{days === 0 ? 'On due date' : `${days} day${days === 1 ? '' : 's'} before`}</option>)}</select></div></div>
          <div className="field-group"><label className="field-label" htmlFor="bill-accountId">Payment account</label><select id="bill-accountId" className="control" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-invalid={Boolean(errors.accountId)} aria-describedby={errors.accountId ? 'bill-accountId-error' : undefined}>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.institution}</option>)}</select>{errors.accountId && <p id="bill-accountId-error" className="field-error">{errors.accountId}</p>}</div>
          <div className="field-group"><label className="field-label" htmlFor="bill-category">Expense category</label><input id="bill-category" className="control" list="bill-category-options" value={category} onChange={(event) => setCategory(event.target.value)} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'bill-category-error' : undefined} /><datalist id="bill-category-options">{categories.map((item) => <option key={item} value={item} />)}</datalist>{errors.category && <p id="bill-category-error" className="field-error">{errors.category}</p>}</div>
          <div className="field-group"><label className="field-label" htmlFor="bill-note">Note <span className="font-normal text-[var(--muted-ink)]">(optional)</span></label><textarea id="bill-note" className="control min-h-24 resize-y py-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reference, plan or payment note" /></div>
        </div>
        <div className="mt-5 flex gap-3 rounded-xl bg-[var(--soft-blue)] p-4 text-sm leading-6 text-[var(--info-strong)]"><BellRing aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><p>Marking this bill paid will create one expense transaction against the selected account.</p></div>
        <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{editing ? 'Save changes' : 'Add bill'}</button></div>
      </form>
      {confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-bill-title" aria-describedby="discard-bill-description"><div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-bill-title" className="text-lg font-bold">Discard {editing ? 'changes' : 'this bill'}?</h3><p id="discard-bill-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Your bill details will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></div></div>}
    </section>
  </div>;
}
