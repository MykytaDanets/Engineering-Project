import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import PremiumGate from '../components/PremiumGate';
import BoughtReview from '../components/BoughtReview';
import { useAuth } from '../context/AuthContext';
import { useShoppingList } from '../hooks/useShoppingList';
import { MANUAL_AISLE, objectId, refreshFromPlan } from '../offline/shopping';
import { isUnreachable } from '../api/connection';
import { mondayOf, shortDate } from '../utils/week';
import { formatQuantity, capitalize } from '../utils/format';
import { UNITS } from '../constants';

const MAX_ITEMS = 300;
const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700';
const errorText = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';
const timeOf = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function SyncStatus({ online, pending, syncing, syncError, syncedAt, onRetry }) {
  const waiting = pending > 0 ? ` ${plural(pending, 'change')} will sync when you're back online.` : '';

  if (!online || (syncError && isUnreachable(syncError))) {
    return (
      <p className="rounded-lg border border-yellow-900 bg-yellow-950/40 px-3 py-2 text-xs text-yellow-500">
        Offline – showing the list saved on this device{syncedAt ? ` (synced ${timeOf(syncedAt)})` : ''}.{waiting}
      </p>
    );
  }
  if (syncError) {
    return (
      <p className="text-xs text-red-400">
        Could not sync: {errorText(syncError)}{' '}
        <button onClick={onRetry} className="text-green-600 hover:text-green-500">Try again</button>
      </p>
    );
  }
  return (
    <p className="text-xs text-gray-600">
      {syncing || pending ? `Syncing${pending ? ` ${plural(pending, 'change')}` : ''}…` : `Saved on this device · synced ${timeOf(syncedAt)}`}
    </p>
  );
}

function groupByAisle(items) {
  const groups = items.reduce((acc, item) => {
    (acc[item.aisle] ??= []).push(item);
    return acc;
  }, {});
  return Object.entries(groups).sort(([a], [b]) => (a === MANUAL_AISLE ? -1 : b === MANUAL_AISLE ? 1 : a.localeCompare(b)));
}

function AddItemForm({ onAdd }) {
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
        disabled={!form.name.trim()}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
      >
        Add
      </button>
    </form>
  );
}

function ShoppingBoard() {
  const { user } = useAuth();
  const { list, loaded, syncedAt, pending, online, syncing, syncError, queue, sync } = useShoppingList(user.id);
  const regenerate = useMutation({ mutationFn: () => refreshFromPlan(user.id, list?.weekStart || mondayOf()) });
  const [reviewing, setReviewing] = useState(false);
  const [moved, setMoved] = useState(null);
  const [localError, setLocalError] = useState(null);

  const run = (op) => queue(op).catch((err) => setLocalError(err.message));

  if (!loaded || (!list && online && !syncError)) return <p className="text-sm text-gray-500 text-center py-8">Loading list…</p>;
  if (!list) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 text-center flex flex-col items-center gap-2">
        <p className="font-medium text-gray-300">No list saved on this device yet</p>
        <p className="text-sm text-gray-500">
          {online ? errorText(syncError) : 'Open this page once while online and the list will be kept here for offline use.'}
        </p>
        {online && <button onClick={sync} className="text-sm text-green-600 hover:text-green-500">Try again</button>}
      </div>
    );
  }

  const items = list.items;
  const checked = items.filter((i) => i.checked).length;

  function addItem(item) {
    if (items.length >= MAX_ITEMS) return setLocalError(`At most ${MAX_ITEMS} items`);
    setLocalError(null);
    run({ type: 'add', item: { _id: objectId(), ...item } });
  }

  if (reviewing) {
    return (
      <BoughtReview
        items={items.filter((i) => i.checked)}
        onMove={queue}
        onCancel={() => setReviewing(false)}
        onDone={(count) => { setMoved({ count, offline: !online }); setReviewing(false); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SyncStatus online={online} pending={pending} syncing={syncing} syncError={syncError} syncedAt={syncedAt} onRetry={sync} />

      {list.weekStart && (
        <p className="text-sm text-gray-500">
          For the week of {shortDate(list.weekStart)}.{' '}
          {online && (
            <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending} className="text-green-600 hover:text-green-500 disabled:opacity-50">
              {regenerate.isPending ? 'Updating…' : 'Update from plan'}
            </button>
          )}
        </p>
      )}

      <AddItemForm onAdd={addItem} />
      {localError && <p className="text-sm text-red-400">{localError}</p>}
      {regenerate.isError && <p className="text-sm text-red-400">{errorText(regenerate.error)}</p>}
      {moved?.count > 0 && (
        <p className="text-sm text-green-600">
          {plural(moved.count, 'item')} {moved.offline ? 'will be added to your pantry when you’re back online.' : 'added to your pantry.'}
        </p>
      )}

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
                      onChange={() => run({ type: 'check', id: item._id, checked: !item.checked })}
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
                    <button onClick={() => run({ type: 'remove', id: item._id })}className="text-xs text-gray-500 hover:text-red-400" aria-label={`Remove ${item.name}`}>✕</button>
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
              Review {checked} ticked & add to pantry
            </button>
            <button
              onClick={() => run({ type: 'clearChecked' })}
              disabled={!checked}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition"
            >
              Clear ticked
            </button>
          </div>
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
