import { useState } from 'react';
import ReceiptLine from './ReceiptLine';
import { formatQuantity, capitalize } from '../utils/format';

const SHOP_UNITS = { tsp: 4.93, tbsp: 14.79, cup: 240 };//ml per unit

function toEditable(item) {
  const ml = SHOP_UNITS[item.unit];
  return {
    id: item._id,
    text: `${formatQuantity(item.quantity, item.unit)} on your list`,
    name: capitalize(item.name),
    quantity: ml ? Math.ceil(item.quantity * ml) : item.quantity,
    unit: ml ? 'ml' : item.unit,
    category: item.category || 'Other',
    expiryDate: '',
    add: true,
  };
}

function lineError(line) {
  if (!line.add) return null;
  const name = line.name.trim();
  if (!name) return 'Every item needs a name';
  if (line.quantity === '' || !(Number(line.quantity) >= 0)) return `Invalid quantity for "${name}"`;
  if (line.expiryDate && isNaN(new Date(line.expiryDate))) return `Invalid expiry date for "${name}"`;
  return null;
}

export default function BoughtReview({ items, onMove, onCancel, onDone }) {
  const [lines, setLines] = useState(() => items.map(toEditable));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleMove() {
    const firstError = lines.map(lineError).find(Boolean);
    if (firstError) return setError(firstError);
    setSaving(true);
    try {
      await onMove({
        type: 'toPantry',
        items: lines.map((l) => ({
          id: l.id,
          add: l.add,
          name: l.name.trim(),
          quantity: Number(l.quantity),
          unit: l.unit,
          category: l.category,
          expiryDate: l.expiryDate || null,
        })),
      });
      onDone(lines.filter((l) => l.add).length);
    } catch (err) {
      setError(err.message || 'Could not move the items');
      setSaving(false);
    }
  }

  const updateLine = (updated) => setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  const adding = lines.filter((l) => l.add).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-200">What did you buy?</h2>
        <p className="text-sm text-gray-500 mt-1">Adjust amounts and add expiry dates. Unticked items just leave the list.</p>
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((line) => <ReceiptLine key={line.id} line={line} onChange={updateLine} />)}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleMove}
          disabled={saving}
          className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : adding ? `Add ${adding} item${adding === 1 ? '' : 's'} to pantry` : 'Remove from list'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition"
        >
          Back to list
        </button>
      </div>
    </div>
  );
}
