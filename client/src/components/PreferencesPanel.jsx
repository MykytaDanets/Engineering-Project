import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPreferences, savePreferences } from '../api/planner';

const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700';

function PreferencesForm({ initial, diets, intolerances, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);

  const save = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preferences'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    },
  });

  function toggleIntolerance(name) {
    setForm((f) => ({
      ...f,
      intolerances: f.intolerances.includes(name) ? f.intolerances.filter((i) => i !== name) : [...f.intolerances, name],
    }));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Diet
          <select value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className={inputBase}>
            {diets.map((d) => <option key={d} value={d}>{d || 'No restriction'}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Servings per meal
          <input
            type="number"
            min="1"
            max="20"
            value={form.servings}
            onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
            className={`${inputBase} w-24`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">Avoid</span>
        <div className="flex flex-wrap gap-1.5">
          {intolerances.map((name) => {
            const active = form.intolerances.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleIntolerance(name)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active ? 'border-red-800 bg-red-950 text-red-400' : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {save.isError && <p className="text-xs text-red-400">{save.error?.response?.data?.message || 'Could not save'}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
          className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PreferencesPanel() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['preferences'], queryFn: getPreferences });
  const prefs = data?.preferences;

  const summary = prefs
    ? [prefs.diet || 'No diet', `${prefs.servings} servings`, ...prefs.intolerances.map((i) => `no ${i}`)].join(' · ')
    : 'Loading…';

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
      {open && data ? (
        <PreferencesForm
          initial={{ diet: prefs.diet, intolerances: prefs.intolerances, servings: prefs.servings }}
          diets={data.diets}
          intolerances={data.intolerances}
          onClose={() => setOpen(false)}
        />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-400">{summary}</p>
          <button onClick={() => setOpen(true)} className="shrink-0 text-sm text-green-600 hover:text-green-500">Edit</button>
        </div>
      )}
    </div>
  );
}
