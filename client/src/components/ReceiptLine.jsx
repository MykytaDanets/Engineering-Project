import { CATEGORIES, UNITS } from '../constants';

const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700 transition';

export default function ReceiptLine({ line, onChange }) {
  const set = (field) => (e) =>
    onChange({ ...line, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 transition ${
        line.add ? 'bg-gray-900 border-gray-800' : 'bg-gray-950 border-gray-900 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={line.add}
          onChange={set('add')}
          className="h-4 w-4 accent-green-700 [color-scheme:dark]"
          aria-label={`Add ${line.name} to pantry`}
        />
        <span className="flex-1 truncate font-mono text-xs text-gray-500">{line.text}</span>
        {line.source === 'dictionary' && (
          <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs text-green-600">Learned</span>
        )}
        {line.source === 'similar' && (
          <span className="rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs text-yellow-600">Guessed</span>
        )}
        {line.price != null && <span className="text-sm text-gray-400">{line.price.toFixed(2)}</span>}
      </div>

      {line.add && (
        <div className="grid grid-cols-6 gap-2">
          <input
            value={line.name}
            onChange={set('name')}
            placeholder="Ingredient name"
            className={`${inputBase} col-span-6 sm:col-span-3`}
          />
          <input
            type="number"
            min="0"
            step="0.001"
            value={line.quantity}
            onChange={set('quantity')}
            className={`${inputBase} col-span-2 sm:col-span-1`}
          />
          <select value={line.unit} onChange={set('unit')} className={`${inputBase} col-span-2 sm:col-span-1`}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
          <input
            type="date"
            value={line.expiryDate}
            onChange={set('expiryDate')}
            title="Expiry date (optional)"
            className={`${inputBase} col-span-2 sm:col-span-1 [color-scheme:dark]`}
          />
          <select value={line.category} onChange={set('category')} className={`${inputBase} col-span-6`}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      {line.warnings?.length > 0 && (
        <p className="text-xs text-yellow-600">{line.warnings.join(' · ')}</p>
      )}
    </div>
  );
}
