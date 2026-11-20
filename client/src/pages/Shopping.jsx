import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import PremiumGate from '../components/PremiumGate';
import BoughtReview from '../components/BoughtReview';
import {
  getShoppingList, generateShoppingList, addShoppingItem, updateShoppingItem,
  deleteShoppingItem, clearChecked,
} from '../api/shopping';
import { mondayOf, shortDate } from '../utils/week';
import { formatQuantity, capitalize } from '../utils/format';
import { UNITS } from '../constants';

const MANUAL_AISLE = 'Added by you';
const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700';
const errorText = (err) => err?.response?.data?.message || 'Something went wrong';

function groupByAisle(items) {
  const groups = items.reduce((acc, item) => {
    (acc[item.aisle] ??= []).push(item);
    return acc;
  }, {});
  return Object.entries(groups).sort(([a], [b]) => (a === MANUAL_AISLE ? -1 : b === MANUAL_AISLE ? 1 : a.localeCompare(b)));
}

function AddItemForm({ onAdd, pending }) {
  const [form, setForm] = useState({ name: '', quantity: 1, unit: 'pcs' });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({ ...form, name: form.name.trim(), quantity: Number(form.quantity) });
    setForm({ name: '', quantity: 1, unit: 'pcs' });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Add an item, e.g. Toilet paper"
        className={`${inputBase} min-w-0 flex-1`}
      />
      <input
        type="number"
        min="0.1"
        step="0.1"
        value={form.quantity}
        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        className={`${inputBase} w-20`}
        aria-label="Quantity"
      />
      <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputBase} aria-label="Unit">
        {UNITS.map((u) => <option key={u}>{u}</option>)}
      </select>
      <button
        type="submit"
        disabled={pending || !form.name.trim()}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
      >
        Add
      </button>
    </form>
  );
}

function ShoppingBoard() {
  const qc = useQueryClient();
  const { data: list, isLoading, isError } = useQuery({ queryKey: ['shopping'], queryFn: getShoppingList });
  const setList = (data) => qc.setQueryData(['shopping'], data.list ?? data);

  const add = useMutation({ mutationFn: addShoppingItem, onSuccess: setList });
  const remove = useMutation({ mutationFn: deleteShoppingItem, onSuccess: setList });
  const clear = useMutation({ mutationFn: clearChecked, onSuccess: setList });
  const regenerate = useMutation({ mutationFn: () => generateShoppingList(list?.weekStart || mondayOf()), onSuccess: setList });
  const [reviewing, setReviewing] = useState(false);
  const [moved, setMoved] = useState(null);

  const toggle = useMutation({
    mutationFn: (item) => updateShoppingItem(item._id, { checked: !item.checked }),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ['shopping'] });
      const previous = qc.getQueryData(['shopping']);
      qc.setQueryData(['shopping'], (old) => ({
        ...old,
        items: old.items.map((i) => (i._id === item._id ? { ...i, checked: !i.checked } : i)),
      }));
      return { previous };
    },
    onError: (_err, _item, context) => qc.setQueryData(['shopping'], context.previous),
    onSuccess: setList,
  });

  if (isLoading) return <p className="text-sm text-gray-500 text-center py-8">Loading list…</p>;
  if (isError) return <p className="text-sm text-red-400 text-center py-8">Failed to load the shopping list.</p>;

  const items = list.items;
  const checked = items.filter((i) => i.checked).length;
  const errors = [add, remove, clear, regenerate, toggle].filter((m) => m.isError);

  if (reviewing) {
    return (
      <BoughtReview
        items={items.filter((i) => i.checked)}
        onCancel={() => setReviewing(false)}
        onDone={(count) => { setMoved(count); setReviewing(false); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {list.weekStart && (
        <p className="text-sm text-gray-500">
          For the week of {shortDate(list.weekStart)}.{' '}
          <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending} className="text-green-600 hover:text-green-500 disabled:opacity-50">
            {regenerate.isPending ? 'Updating…' : 'Update from plan'}
          </button>
        </p>
      )}

      <AddItemForm onAdd={(item) => add.mutate(item)} pending={add.isPending} />
      {errors.map((m, i) => <p key={i} className="text-sm text-red-400">{errorText(m.error)}</p>)}

      {items.length === 0 ? (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-10 text-center">
          <p className="font-medium text-gray-300">Your shopping list is empty</p>
          <p className="text-sm mt-1 text-gray-500">
            Plan some meals in the <Link to="/planner" className="text-green-600 hover:text-green-500">planner</Link> and make a list from it.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div className="h-full rounded-full bg-green-700 transition-all" style={{ width: `${(checked / items.length) * 100}%` }} />
            </div>
            <p className="text-xs text-gray-500">{checked} of {items.length} ticked</p>
          </div>

          {groupByAisle(items).map(([aisle, aisleItems]) => (
            <section key={aisle}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">{aisle}</h2>
              <div className="flex flex-col gap-1.5">
                {aisleItems.map((item) => (
                  <div key={item._id} className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggle.mutate(item)}
                      className="h-5 w-5 shrink-0 accent-green-700 [color-scheme:dark]"
                      aria-label={`Bought ${item.name}`}
                    />
                    <div className={`min-w-0 flex-1 ${item.checked ? 'opacity-40 line-through' : ''}`}>
                      <span className="text-sm font-medium text-gray-100">{capitalize(item.name)}</span>
                      <span className="ml-2 text-sm text-gray-500">{formatQuantity(item.quantity, item.unit)}</span>
                      {(item.recipes.length > 0 || item.note) && (
                        <p className="truncate text-xs text-gray-600">{[item.note, item.recipes.join(', ')].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <button onClick={() => remove.mutate(item._id)} className="text-xs text-gray-500 hover:text-red-400" aria-label={`Remove ${item.name}`}>✕</button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setMoved(null); setReviewing(true); }}
              disabled={!checked}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
            >
              Move {checked} ticked to pantry
            </button>
            <button
              onClick={() => clear.mutate()}
              disabled={!checked || clear.isPending}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition"
            >
              Clear ticked
            </button>
          </div>
          {moved != null && <p className="text-xs text-green-600">{moved} item{moved === 1 ? '' : 's'} added to your pantry.</p>}
        </>
      )}
    </div>
  );
}

export default function Shopping() {
  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Shopping list</h1>
          <p className="text-sm text-gray-500 mt-1">Everything your meal plan needs, minus what is already in your pantry.</p>
        </div>
        <PremiumGate feature="The shopping list">
          <ShoppingBoard />
        </PremiumGate>
      </main>
    </div>
  );
}
