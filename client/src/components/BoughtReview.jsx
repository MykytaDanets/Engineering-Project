import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReceiptLine from './ReceiptLine';
import { moveCheckedToPantry } from '../api/shopping';
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

export default function BoughtReview({ items, onCancel, onDone }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState(() => items.map(toEditable));

  const move = useMutation({
    mutationFn: () => moveCheckedToPantry(lines.map((l) => ({
      id: l.id,
      add: l.add,
      name: l.name.trim(),
      quantity: Number(l.quantity),
      unit: l.unit,
      category: l.category,
      expiryDate: l.expiryDate || null,
    }))),
    onSuccess: (data) => {
      qc.setQueryData(['shopping'], data.list);
      qc.invalidateQueries({ queryKey: ['pantry'] });
      onDone(data.moved);
    },
  });

  const updateLine = (updated) => setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  const adding = lines.filter((l) => l.add).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-200">What did you buy?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Change the amount to what you actually bought and add expiry dates. Untick anything that shouldn’t go into the pantry –
          it still leaves the shopping list.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((line) => <ReceiptLine key={line.id} line={line} onChange={updateLine} />)}
      </div>

      {move.isError && <p className="text-sm text-red-400">{move.error?.response?.data?.message || 'Could not move the items'}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => move.mutate()}
          disabled={move.isPending}
          className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
        >
          {move.isPending ? 'Saving…' : adding ? `Add ${adding} item${adding === 1 ? '' : 's'} to pantry` : 'Remove from list'}
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
