import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeftRight, X } from 'lucide-react';
import { getAccountBalance } from '../../lib/finance';
import { getTodayKey } from '../../lib/date';
import { formatMoney, parseMoneyToMinor } from '../../lib/money';
import type { FinanceState, NewTransactionInput, Transaction, TransactionType } from '../../types/finance';

interface AddTransactionDrawerProps {
  open: boolean;
  state: FinanceState;
  transaction?: Transaction | null;
  initialType?: TransactionType;
  initialAccountId?: string;
  onClose: () => void;
  onSubmit: (input: NewTransactionInput) => void;
}

type FieldErrors = Partial<Record<'amount' | 'accountId' | 'toAccountId' | 'occurredOn' | 'payee' | 'category', string>>;

const categories: Record<Exclude<TransactionType, 'transfer'>, string[]> = {
  expense: ['Groceries', 'Housing', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Health', 'Insurance', 'Other'],
  income: ['Salary', 'Side income', 'Interest', 'Refund', 'Other'],
};

export function AddTransactionDrawer({ open, state, transaction, initialType = 'expense', initialAccountId, onClose, onSubmit }: AddTransactionDrawerProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(state.accounts[1]?.id ?? '');
  const [occurredOn, setOccurredOn] = useState(getTodayKey);
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState(categories.expense[0]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const editing = Boolean(transaction);

  const accountBalances = useMemo(
    () => new Map(state.accounts.map((account) => [account.id, getAccountBalance(account, state.transactions)])),
    [state],
  );
  const selectableAccounts = useMemo(() => state.accounts.filter((account) => !account.archived || account.id === transaction?.accountId || account.id === transaction?.toAccountId), [state.accounts, transaction]);
  const initialFromAccount = initialAccountId ?? selectableAccounts[0]?.id ?? '';
  const initialToAccount = selectableAccounts.find((item) => item.id !== initialFromAccount)?.id ?? '';
  const dirty = transaction
    ? amount !== (transaction.amountMinor / 100).toFixed(2) || type !== transaction.type || accountId !== transaction.accountId || toAccountId !== (transaction.toAccountId ?? '') || occurredOn !== transaction.occurredOn || payee !== transaction.payee || category !== transaction.category || note !== (transaction.note ?? '')
    : Boolean(amount || payee || note || type !== initialType || accountId !== initialFromAccount || toAccountId !== initialToAccount || occurredOn !== getTodayKey() || category !== (initialType === 'transfer' ? 'Transfer' : categories[initialType][0]));

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount((transaction.amountMinor / 100).toFixed(2));
      setAccountId(transaction.accountId);
      setToAccountId(transaction.toAccountId ?? '');
      setOccurredOn(transaction.occurredOn);
      setPayee(transaction.payee);
      setCategory(transaction.category);
      setNote(transaction.note ?? '');
    } else {
      setType(initialType); setAmount(''); setAccountId(initialFromAccount); setToAccountId(initialToAccount);
      setOccurredOn(getTodayKey()); setPayee(''); setCategory(initialType === 'transfer' ? 'Transfer' : categories[initialType][0]); setNote('');
    }
    setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => amountRef.current?.focus(), 50);
  }, [open, transaction, initialType, initialFromAccount, initialToAccount]);

  useEffect(() => {
    if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors, submitted]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmClose) setConfirmClose(false);
      else if (dirty) setConfirmClose(true);
      else onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmClose, dirty, onClose]);

  if (!open) return null;

  const validate = (): { errors: FieldErrors; amountMinor: number | null } => {
    const nextErrors: FieldErrors = {};
    const amountMinor = parseMoneyToMinor(amount);
    if (!amountMinor) nextErrors.amount = 'Enter an amount greater than ₹0 with no more than two decimal places.';
    if (!accountId) nextErrors.accountId = 'Select an account.';
    if (type === 'transfer' && !toAccountId) nextErrors.toAccountId = 'Select a destination account.';
    if (type === 'transfer' && toAccountId === accountId) nextErrors.toAccountId = 'Choose a different destination account.';
    if (!occurredOn) nextErrors.occurredOn = 'Choose the transaction date.';
    if (!payee.trim()) nextErrors.payee = type === 'transfer' ? 'Enter a transfer description.' : 'Enter a payee or source.';
    if (type !== 'transfer' && !category) nextErrors.category = 'Select a category.';
    return { errors: nextErrors, amountMinor };
  };

  const validateField = () => {
    if (!submitted && !amount && !payee) return;
    setErrors(validate().errors);
  };

  const reset = () => { setErrors({}); setSubmitted(false); setConfirmClose(false); };

  const close = () => {
    if (dirty) setConfirmClose(true);
    else { reset(); onClose(); }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const result = validate();
    setErrors(result.errors);
    if (!result.amountMinor || Object.keys(result.errors).length > 0) return;

    onSubmit({
      type,
      amountMinor: result.amountMinor,
      occurredOn,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      payee: payee.trim(),
      category: type === 'transfer' ? 'Transfer' : category,
      note: note.trim() || undefined,
    });
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="drawer-enter relative flex h-dvh w-full max-w-[470px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="transaction-form-title" className="text-2xl font-bold tracking-[-0.03em]">{editing ? 'Edit transaction' : 'Add transaction'}</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">{editing ? 'Update this money movement and its account balance.' : 'Record a new money movement.'}</p></div>
          <button className="icon-button" type="button" aria-label={`Close ${editing ? 'edit' : 'add'} transaction`} onClick={close}><X aria-hidden="true" /></button>
        </div>

        <form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
          {submitted && Object.keys(errors).length > 0 && (
            <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}>
              <div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#transaction-${field}`}>{message}</a></li>)}</ul></div></div>
            </div>
          )}

          <fieldset>
            <legend className="sr-only">Transaction type</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--muted)] p-1">
              {(['expense', 'income', 'transfer'] as TransactionType[]).map((option) => (
                <button key={option} className={`min-h-10 rounded-[10px] px-2 text-sm font-semibold capitalize transition-colors ${type === option ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[0_2px_8px_rgba(26,44,34,.08)]' : 'text-[var(--muted-ink)] hover:text-[var(--ink)]'}`} type="button" aria-pressed={type === option} onClick={() => { setType(option); setCategory(option === 'transfer' ? 'Transfer' : categories[option][0]); }}>{option}</button>
              ))}
            </div>
          </fieldset>

          {type === 'transfer' && <p className="mt-4 flex gap-2 rounded-xl bg-[var(--soft-blue)] p-3 text-sm leading-5 text-[var(--info-strong)]"><ArrowLeftRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Transfers move money between your accounts and do not change income or expense totals.</p>}

          <div className="mt-5 text-center">
            <label className="field-label" htmlFor="transaction-amount">Amount</label>
            <div className="mx-auto flex max-w-[270px] items-center border-b-2 border-[var(--border-strong)] px-2 focus-within:border-[var(--primary)]">
              <span className="text-2xl font-bold text-[var(--muted-ink)]">₹</span>
              <input ref={amountRef} id="transaction-amount" className="min-w-0 flex-1 bg-transparent py-3 text-center text-3xl font-bold tracking-[-0.04em] outline-none placeholder:text-[var(--placeholder)]" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} onBlur={validateField} placeholder="0.00" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'transaction-amount-error' : undefined} />
            </div>
            {errors.amount && <p id="transaction-amount-error" className="field-error">{errors.amount}</p>}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="field-group"><label className="field-label" htmlFor="transaction-accountId">{type === 'transfer' ? 'From account' : 'Account'}</label><select id="transaction-accountId" className="control w-full" value={accountId} onChange={(event) => setAccountId(event.target.value)} onBlur={validateField} aria-invalid={Boolean(errors.accountId)} aria-describedby={errors.accountId ? 'transaction-accountId-error' : undefined}>{selectableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.archived ? ' (archived)' : ''} · {formatMoney(accountBalances.get(account.id) ?? 0)}</option>)}</select>{errors.accountId && <p id="transaction-accountId-error" className="field-error">{errors.accountId}</p>}</div>
            {type === 'transfer' ? (
              <div className="field-group"><label className="field-label" htmlFor="transaction-toAccountId">To account</label><select id="transaction-toAccountId" className="control w-full" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} onBlur={validateField} aria-invalid={Boolean(errors.toAccountId)} aria-describedby={errors.toAccountId ? 'transaction-toAccountId-error' : undefined}>{selectableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.archived ? ' (archived)' : ''} · {formatMoney(accountBalances.get(account.id) ?? 0)}</option>)}</select>{errors.toAccountId && <p id="transaction-toAccountId-error" className="field-error">{errors.toAccountId}</p>}</div>
            ) : (
              <div className="field-group"><label className="field-label" htmlFor="transaction-category">Category</label><select id="transaction-category" className="control w-full" value={category} onChange={(event) => setCategory(event.target.value)} onBlur={validateField} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'transaction-category-error' : undefined}>{categories[type].map((option) => <option key={option}>{option}</option>)}</select>{errors.category && <p id="transaction-category-error" className="field-error">{errors.category}</p>}</div>
            )}
            <div className="field-group"><label className="field-label" htmlFor="transaction-occurredOn">Date</label><input id="transaction-occurredOn" className="control w-full" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} onBlur={validateField} aria-invalid={Boolean(errors.occurredOn)} aria-describedby={errors.occurredOn ? 'transaction-occurredOn-error' : undefined} />{errors.occurredOn && <p id="transaction-occurredOn-error" className="field-error">{errors.occurredOn}</p>}</div>
            <div className="field-group"><label className="field-label" htmlFor="transaction-payee">{type === 'income' ? 'Source' : type === 'transfer' ? 'Description' : 'Payee'}</label><input id="transaction-payee" className="control w-full" type="text" value={payee} onChange={(event) => setPayee(event.target.value)} onBlur={validateField} placeholder={type === 'income' ? 'e.g. Salary credit' : type === 'transfer' ? 'e.g. Move to savings' : 'e.g. Reliance Fresh'} aria-invalid={Boolean(errors.payee)} aria-describedby={errors.payee ? 'transaction-payee-error' : undefined} />{errors.payee && <p id="transaction-payee-error" className="field-error">{errors.payee}</p>}</div>
            <div className="field-group sm:col-span-2"><label className="field-label" htmlFor="transaction-note">Note <span className="font-normal text-[var(--muted-ink)]">(optional)</span></label><input id="transaction-note" className="control w-full" type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add useful context" /></div>
          </div>

          <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{editing ? 'Save changes' : `Save ${type}`}</button></div>
        </form>

        {confirmClose && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-description">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-title" className="text-lg font-bold">Discard {editing ? 'changes' : 'this entry'}?</h3><p id="discard-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Your {editing ? 'updates' : 'transaction details'} will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={() => { reset(); onClose(); }}>Discard</button></div></div>
          </div>
        )}
      </section>
    </div>
  );
}
