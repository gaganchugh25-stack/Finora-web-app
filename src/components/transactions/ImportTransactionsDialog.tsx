import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { buildImportPreview, type ImportPreviewRow } from '../../lib/csv';
import { formatMoney } from '../../lib/money';
import type { FinanceState } from '../../types/finance';

interface ImportTransactionsDialogProps {
  open: boolean;
  state: FinanceState;
  onClose: () => void;
  onImport: (rows: ImportPreviewRow[]) => void;
}

export function ImportTransactionsDialog({ open, state, onClose, onImport }: ImportTransactionsDialogProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    setFileName(''); setRows([]); setFileError('');
    window.setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const validRows = rows.filter((row) => row.input);
  const invalidRows = rows.filter((row) => row.errors.length > 0);

  const readFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setFileError('');
    if (!file.name.toLocaleLowerCase('en-IN').endsWith('.csv')) {
      setRows([]); setFileError('Choose a CSV file. Other file types are not imported.'); return;
    }
    if (file.size > 2_000_000) {
      setRows([]); setFileError('The CSV must be smaller than 2 MB for this local preview.'); return;
    }
    try {
      const preview = buildImportPreview(await file.text(), state);
      setRows(preview);
      if (preview.length === 0) setFileError('The CSV does not contain any transaction rows.');
    } catch {
      setRows([]); setFileError('This CSV could not be read. Check the file and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#10251b]/50 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-popover)]" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div><h2 ref={titleRef} id="import-title" tabIndex={-1} className="text-xl font-bold outline-none">Import transactions</h2><p className="mt-1 text-sm text-[var(--muted-ink)]">Preview and validate every row before saving it.</p></div>
          <button className="icon-button" type="button" aria-label="Close CSV import" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-5 sm:p-6">
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--canvas)] p-6 text-center">
            <FileSpreadsheet aria-hidden="true" className="mx-auto size-8 text-[var(--primary)]" />
            <h3 className="mt-3 font-bold">Choose a Finora CSV</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-[var(--muted-ink)]">Required columns: Type, Date, Amount, Account, To Account, Payee and Category. Note is optional. Dates use YYYY-MM-DD.</p>
            <input ref={inputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} />
            <button className="secondary-button mt-4 inline-flex" type="button" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" className="size-4" />Choose CSV file</button>
            {fileName && <p className="mt-3 text-sm font-semibold">{fileName}</p>}
          </div>

          {fileError && <p className="mt-4 flex gap-2 rounded-xl bg-[var(--soft-danger)] p-3 text-sm text-[var(--danger-strong)]" role="alert"><AlertCircle aria-hidden="true" className="size-5 shrink-0" />{fileError}</p>}

          {rows.length > 0 && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Import preview</h3><p className="mt-1 text-sm text-[var(--muted-ink)]">{validRows.length} ready · {invalidRows.length} need attention</p></div>{invalidRows.length === 0 && <span className="status status-positive"><CheckCircle2 aria-hidden="true" className="mr-1.5 size-4" />Ready to import</span>}</div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="data-table min-w-[720px]"><thead><tr><th>Row</th><th>Type</th><th>Date</th><th>Payee</th><th className="text-right">Amount</th><th>Result</th></tr></thead><tbody>{rows.slice(0, 50).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td className="capitalize">{row.input?.type ?? row.raw[0] ?? '—'}</td><td>{row.input?.occurredOn ?? row.raw[1] ?? '—'}</td><td>{row.input?.payee ?? row.raw[5] ?? '—'}</td><td className="text-right tabular-nums">{row.input ? formatMoney(row.input.amountMinor) : row.raw[2] ?? '—'}</td><td>{row.errors.length > 0 ? <span className="text-[var(--danger-strong)]">{row.errors.join(' ')}</span> : <span className="text-[var(--positive-strong)]">Valid</span>}</td></tr>)}</tbody></table>
              </div>
              {rows.length > 50 && <p className="mt-2 text-xs text-[var(--muted-ink)]">Showing the first 50 of {rows.length} rows. All valid rows will be imported.</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] p-4 sm:px-6"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" disabled={validRows.length === 0 || invalidRows.length > 0} onClick={() => onImport(rows)}>Import {validRows.length || ''} transaction{validRows.length === 1 ? '' : 's'}</button></div>
      </section>
    </div>
  );
}
