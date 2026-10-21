import { useId, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import type { CashFlowPoint } from '../../types/finance';

export function CashFlowChart({ points }: { points: CashFlowPoint[] }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const data = points.map((point) => ({
    ...point,
    income: point.incomeMinor / 100,
    expense: point.expenseMinor / 100,
  }));
  const hasActivity = points.some((point) => point.incomeMinor > 0 || point.expenseMinor > 0);
  const incomeMinor = points.reduce((total, point) => total + point.incomeMinor, 0);
  const expenseMinor = points.reduce((total, point) => total + point.expenseMinor, 0);

  return (
    <section className="panel min-w-0" aria-labelledby="cash-flow-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cash-flow-title" className="section-title">Financial pulse</h2>
          <p className="section-copy">Income and expenses over the last six months</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-ink)]" aria-label="Chart legend">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded-full bg-[var(--primary)]" />Income</span>
          <span className="flex items-center gap-1.5"><i className="w-4 border-t-2 border-dashed border-[var(--warning)]" />Expenses</span>
        </div>
      </div>

      {hasActivity ? <div className="h-[250px] w-full min-w-0" role="img" aria-label={`Income is ${incomeMinor >= expenseMinor ? 'above' : 'below'} expenses by ${formatMoney(Math.abs(incomeMinor - expenseMinor))} across the last six months.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 14, right: 8, bottom: 2, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-ink)', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} width={62} tick={{ fill: 'var(--muted-ink)', fontSize: 12 }} tickFormatter={(value: number) => formatMoneyCompact(value * 100)} />
            <Tooltip
              formatter={(value, name) => [formatMoney(Number(value) * 100), name === 'income' ? 'Income' : 'Expenses']}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--ink)', boxShadow: 'var(--shadow-popover)' }}
              labelStyle={{ color: 'var(--muted-ink)', marginBottom: 6 }}
            />
            <Line type="monotone" dataKey="income" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="expense" stroke="var(--warning)" strokeWidth={2.5} strokeDasharray="7 5" dot={{ r: 3, fill: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div> : <div className="grid h-[250px] place-items-center rounded-xl bg-[var(--muted)] text-center"><div><p className="text-sm font-bold">No cash-flow activity yet</p><p className="mt-1 text-xs text-[var(--muted-ink)]">Income and expense trends will appear after you add transactions.</p></div></div>}

      {hasActivity && <button className="mt-2 min-h-10 text-sm font-semibold text-[var(--primary)] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current" type="button" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((value) => !value)}>
        {showTable ? 'Hide data table' : 'View data table'}
      </button>}
      <div id={tableId} hidden={!showTable || !hasActivity} className="mt-2 overflow-x-auto">
        <table className="data-table min-w-[520px]">
          <caption className="sr-only">Monthly income and expense values</caption>
          <thead><tr><th>Month</th><th className="text-right">Income</th><th className="text-right">Expenses</th></tr></thead>
          <tbody>{points.map((point) => <tr key={point.month}><td>{point.month}</td><td className="text-right tabular-nums">{formatMoney(point.incomeMinor)}</td><td className="text-right tabular-nums">{formatMoney(point.expenseMinor)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
