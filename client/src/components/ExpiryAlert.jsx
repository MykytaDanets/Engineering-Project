import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removePantryItems } from '../api/pantry';
import { capitalize, daysUntil } from '../utils/format';

const SOON_DAYS = 3;

const names = (items) => items.map((i) => capitalize(i.name)).join(', ');
const whenText = (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

export default function ExpiryAlert({ items, readOnly = false }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const dated = items.filter((i) => i.expiryDate).map((i) => ({ ...i, days: daysUntil(i.expiryDate) }));
  const expired = dated.filter((i) => i.days < 0);
  const soon = dated.filter((i) => i.days >= 0 && i.days <= SOON_DAYS).sort((a, b) => a.days - b.days);

  const remove = useMutation({
    mutationFn: () => removePantryItems(expired.map((i) => i._id)),
    onSuccess: () => {
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['pantry'] });
    },
  });

  if (!expired.length && !soon.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {expired.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 flex flex-col gap-2">
          <p className="text-sm text-red-400">
            <span className="font-semibold">{expired.length} expired:</span> {names(expired)}
          </p>
          {readOnly ? null : confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-300">Remove {expired.length} item{expired.length === 1 ? '' : 's'} from your pantry?</span>
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-800 disabled:opacity-50 transition"
              >
                {remove.isPending ? 'Removing…' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="w-fit rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950 transition"
            >
              Remove expired
            </button>
          )}
          {remove.isError && <p className="text-xs text-red-400">{remove.error?.response?.data?.message || 'Could not remove items'}</p>}
        </div>
      )}

      {soon.length > 0 && (
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-yellow-500">
            <span className="font-semibold">Use soon:</span>{' '}
            {soon.map((i) => `${capitalize(i.name)} (${whenText(i.days)})`).join(', ')}
          </p>
          <Link to="/recipes" className="text-sm font-medium text-yellow-500 underline-offset-2 hover:underline">
            Find recipes that use them
          </Link>
        </div>
      )}
    </div>
  );
}
