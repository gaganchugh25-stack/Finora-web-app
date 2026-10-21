import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Info, X } from 'lucide-react';
import { parseMoneyToMinor } from '../../lib/money';
import type { SavingsActivityInput, SavingsActivityType, SavingsGoal } from '../../types/finance';

interface SavingsActivityDrawerProps {
  open: boolean;
  goal?: SavingsGoal | null;
  onClose: () => void;
  onSubmit: (input: SavingsActivityInput) => void;
}

type Errors = Partial<Record<'amount' | 'occurredOn', string>>;
function todayKey(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }

export function SavingsActivityDrawer({ open, goal, onClose, onSubmit }: SavingsActivityDrawerProps) {
  const [type, setType] = useState<SavingsActivityType>('deposit');
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayKey);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const dirty = Boolean(amount || note || type !== 'deposit' || occurredOn !== todayKey());

  useEffect(() => { if (!open) return; setType('deposit'); setAmount(''); setOccurredOn(todayKey()); setNote(''); setErrors({}); setSubmitted(false); setConfirmClose(false); window.setTimeout(() => amountRef.current?.focus(), 50); }, [open, goal]);
  useEffect(() => { if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus(); }, [errors, submitted]);
  useEffect(() => { if (!open) return; const keydown = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; if (confirmClose) setConfirmClose(false); else if (dirty) setConfirmClose(true); else onClose(); }; window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown); }, [open, confirmClose, dirty, onClose]);
  if (!open || !goal) return null;
  const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(true); const next: Errors = {}; const amountMinor = parseMoneyToMinor(amount); if (amountMinor === null) next.amount = 'Enter an amount greater than zero.'; else if (type === 'withdrawal' && amountMinor > goal.savedMinor) next.amount = 'Withdrawal cannot exceed the amount currently saved.'; if (!occurredOn) next.occurredOn = 'Select an activity date.'; setErrors(next); if (amountMinor === null || Object.keys(next).length > 0) return; onSubmit({ goalId: goal.id, type, amountMinor, occurredOn, note: note.trim() || undefined }); };

  return <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="drawer-enter relative flex h-dvh w-full max-w-[470px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="saving-activity-title"><div className="flex items-start justify-between gap-4"><div><h2 id="saving-activity-title" className="text-2xl font-bold tracking-[-0.03em]">Update savings</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">Record progress for {goal.name}.</p></div><button className="icon-button" type="button" aria-label="Close savings update" onClick={close}><X aria-hidden="true" /></button></div><form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
    {submitted && Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#saving-${field}`}>{message}</a></li>)}</ul></div></div></div>}
    <fieldset><legend className="field-label">Update type</legend><div className="mt-2 grid grid-cols-2 gap-2">{([{ value: 'deposit', label: 'Add savings', Icon: ArrowDownLeft }, { value: 'withdrawal', label: 'Withdraw', Icon: ArrowUpRight }] as const).map(({ value, label, Icon }) => <label key={value} className={`flex min-h-[64px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${type === value ? 'border-[var(--primary)] bg-[var(--soft-primary)] text-[var(--primary-strong)]' : 'border-[var(--border)]'}`}><input className="sr-only" type="radio" name="saving-type" value={value} checked={type === value} onChange={() => setType(value)} /><Icon aria-hidden="true" className="size-5" />{label}</label>)}</div></fieldset>
    <div className="mt-5 grid gap-4"><div className="field-group"><label className="field-label" htmlFor="saving-amount">Amount</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input ref={amountRef} id="saving-amount" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'saving-amount-error' : undefined} /></div>{errors.amount && <p id="saving-amount-error" className="field-error">{errors.amount}</p>}</div><div className="field-group"><label className="field-label" htmlFor="saving-occurredOn">Date</label><input id="saving-occurredOn" className="control" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} aria-invalid={Boolean(errors.occurredOn)} aria-describedby={errors.occurredOn ? 'saving-occurredOn-error' : undefined} />{errors.occurredOn && <p id="saving-occurredOn-error" className="field-error">{errors.occurredOn}</p>}</div><div className="field-group"><label className="field-label" htmlFor="saving-note">Note <span className="font-normal text-[var(--muted-ink)]">(optional)</span></label><textarea id="saving-note" className="control min-h-24 py-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Monthly allocation" /></div></div>
    <div className="mt-5 flex gap-3 rounded-xl bg-[var(--soft-blue)] p-4 text-sm leading-6 text-[var(--info-strong)]"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" /><p>This tracks money allocated to the goal. It does not change any account balance or income and expense totals.</p></div>
    <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{type === 'deposit' ? 'Add to goal' : 'Record withdrawal'}</button></div>
  </form>{confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-saving-title" aria-describedby="discard-saving-description"><div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-saving-title" className="text-lg font-bold">Discard this update?</h3><p id="discard-saving-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">The savings activity will not be recorded.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></div></div>}</section></div>;
}
