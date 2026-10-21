import { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { parseMoneyToMinor, parseNonNegativeMoneyToMinor } from '../../lib/money';
import type { Account, SavingsGoal, SavingsGoalInput } from '../../types/finance';

interface SavingsGoalDrawerProps {
  open: boolean;
  goal?: SavingsGoal | null;
  onClose: () => void;
  onSubmit: (input: SavingsGoalInput) => void;
}

type Errors = Partial<Record<'name' | 'target' | 'initial' | 'targetDate', string>>;
const accents: Account['accent'][] = ['emerald', 'blue', 'amber', 'slate'];

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function SavingsGoalDrawer({ open, goal, onClose, onSubmit }: SavingsGoalDrawerProps) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [initial, setInitial] = useState('0.00');
  const [targetDate, setTargetDate] = useState('');
  const [accent, setAccent] = useState<Account['accent']>('emerald');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const editing = Boolean(goal);
  const startOn = goal?.createdOn ?? todayKey();
  const dirty = goal
    ? name !== goal.name || target !== (goal.targetMinor / 100).toFixed(2) || targetDate !== goal.targetDate || accent !== goal.accent
    : Boolean(name || target || initial !== '0.00' || targetDate || accent !== 'emerald');

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? ''); setTarget(goal ? (goal.targetMinor / 100).toFixed(2) : ''); setInitial('0.00');
    setTargetDate(goal?.targetDate ?? ''); setAccent(goal?.accent ?? 'emerald'); setErrors({}); setSubmitted(false); setConfirmClose(false);
    window.setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, goal]);

  useEffect(() => { if (submitted && Object.keys(errors).length > 0) errorSummaryRef.current?.focus(); }, [errors, submitted]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; if (confirmClose) setConfirmClose(false); else if (dirty) setConfirmClose(true); else onClose(); };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [open, confirmClose, dirty, onClose]);
  if (!open) return null;

  const close = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    const next: Errors = {};
    const targetMinor = parseMoneyToMinor(target);
    const initialSavedMinor = parseNonNegativeMoneyToMinor(initial);
    if (!name.trim()) next.name = 'Enter a clear savings goal name.';
    if (targetMinor === null) next.target = 'Enter a target amount greater than zero.';
    if (!editing && initialSavedMinor === null) next.initial = 'Enter zero or a positive starting amount.';
    if (!targetDate) next.targetDate = 'Select a target date.'; else if (targetDate < startOn) next.targetDate = 'Target date must be on or after the goal start date.';
    setErrors(next);
    if (targetMinor === null || initialSavedMinor === null || Object.keys(next).length > 0) return;
    onSubmit({ name: name.trim(), targetMinor, targetDate, createdOn: startOn, accent, initialSavedMinor: editing ? undefined : initialSavedMinor });
  };

  return <div className="fixed inset-0 z-50 flex justify-end bg-[#10251b]/45 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="drawer-enter relative flex h-dvh w-full max-w-[480px] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-[-18px_0_50px_rgba(21,42,31,0.18)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="goal-form-title"><div className="flex items-start justify-between gap-4"><div><h2 id="goal-form-title" className="text-2xl font-bold tracking-[-0.03em]">{editing ? 'Edit savings goal' : 'Add savings goal'}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]">Define the amount and date you are working towards.</p></div><button className="icon-button" type="button" aria-label={`Close ${editing ? 'edit' : 'add'} savings goal`} onClick={close}><X aria-hidden="true" /></button></div><form className="mt-6 flex flex-1 flex-col" onSubmit={submit} noValidate>
    {submitted && Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="mb-5 rounded-xl bg-[var(--soft-danger)] p-4 text-sm text-[var(--danger-strong)] outline-none" role="alert" tabIndex={-1}><div className="flex gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><div><h3 className="font-bold">Check the highlighted fields</h3><ul className="mt-2 list-disc space-y-1 pl-4">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="underline underline-offset-2" href={`#goal-${field}`}>{message}</a></li>)}</ul></div></div></div>}
    <div className="grid gap-4"><div className="field-group"><label className="field-label" htmlFor="goal-name">Goal name</label><input ref={nameRef} id="goal-name" className="control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Emergency fund" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'goal-name-error' : undefined} />{errors.name && <p id="goal-name-error" className="field-error">{errors.name}</p>}</div><div className="field-group"><label className="field-label" htmlFor="goal-target">Target amount</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input id="goal-target" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.target)} aria-describedby={errors.target ? 'goal-target-error' : undefined} /></div>{errors.target && <p id="goal-target-error" className="field-error">{errors.target}</p>}</div>{!editing && <div className="field-group"><label className="field-label" htmlFor="goal-initial">Already saved</label><div className="control flex items-center gap-2"><span className="font-semibold text-[var(--muted-ink)]">₹</span><input id="goal-initial" className="min-w-0 flex-1 bg-transparent outline-none" inputMode="decimal" value={initial} onChange={(event) => setInitial(event.target.value)} aria-invalid={Boolean(errors.initial)} aria-describedby={`goal-initial-help${errors.initial ? ' goal-initial-error' : ''}`} /></div><p id="goal-initial-help" className="text-xs leading-5 text-[var(--muted-ink)]">Starting allocation only; account balances are unchanged.</p>{errors.initial && <p id="goal-initial-error" className="field-error">{errors.initial}</p>}</div>}<div className="field-group"><label className="field-label" htmlFor="goal-targetDate">Target date</label><input id="goal-targetDate" className="control" type="date" min={startOn} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} aria-invalid={Boolean(errors.targetDate)} aria-describedby={errors.targetDate ? 'goal-targetDate-error' : undefined} />{errors.targetDate && <p id="goal-targetDate-error" className="field-error">{errors.targetDate}</p>}</div></div>
    <fieldset className="mt-5"><legend className="field-label">Goal colour</legend><div className="mt-2 flex gap-3">{accents.map((option) => <button key={option} className={`account-swatch account-swatch-${option} ${accent === option ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`} type="button" aria-label={`${option} goal colour`} aria-pressed={accent === option} onClick={() => setAccent(option)} />)}</div></fieldset>
    <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-3 pt-8"><button className="secondary-button" type="button" onClick={close}>Cancel</button><button className="primary-button justify-center" type="submit">{editing ? 'Save changes' : 'Add savings goal'}</button></div>
  </form>{confirmClose && <div className="absolute inset-0 z-10 grid place-items-center bg-[#10251b]/40 p-5" role="alertdialog" aria-modal="true" aria-labelledby="discard-goal-title" aria-describedby="discard-goal-description"><div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-popover)]"><h3 id="discard-goal-title" className="text-lg font-bold">Discard {editing ? 'changes' : 'this goal'}?</h3><p id="discard-goal-description" className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">Your savings goal details will not be saved.</p><div className="mt-5 flex justify-end gap-2"><button className="secondary-button" type="button" onClick={() => setConfirmClose(false)}>Keep editing</button><button className="danger-button" type="button" onClick={onClose}>Discard</button></div></div></div>}</section></div>;
}
