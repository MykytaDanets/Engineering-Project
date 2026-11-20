import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cookRecipe } from '../api/recipes';
import { addPlanEntry } from '../api/planner';
import { usePlan } from '../hooks/usePlan';
import { mondayOf, DAY_NAMES } from '../utils/week';

const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700';
const errorText = (err) => err?.response?.data?.message || 'Something went wrong';

function CookPanel({ recipe }) {
  const qc = useQueryClient();
  const [servings, setServings] = useState(recipe.servings || 1);
  const cook = useMutation({
    mutationFn: () => cookRecipe(recipe.id, servings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  });

  if (cook.isSuccess) {
    const { used, skipped } = cook.data;
    return (
      <div className="rounded-xl bg-gray-800/50 border border-gray-800 p-4 flex flex-col gap-2 text-sm">
        <p className="font-medium text-green-600">Enjoy your meal! Your pantry has been updated.</p>
        {used.length > 0 && (
          <p className="text-gray-400">Used: {used.map((u) => `${u.amount} ${u.unit} ${u.name}`).join(', ')}</p>
        )}
        {skipped.length > 0 && (
          <ul className="text-xs text-yellow-600">
            {skipped.map((s) => <li key={s.name}>{s.name}: {s.reason}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min="1"
        max="50"
        value={servings}
        onChange={(e) => setServings(Number(e.target.value))}
        className={`${inputBase} w-20`}
        aria-label="Servings"
      />
      <span className="text-sm text-gray-500">servings</span>
      <button
        onClick={() => cook.mutate()}
        disabled={cook.isPending || !(servings >= 1)}
        className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
      >
        {cook.isPending ? 'Updating pantry…' : 'Cook this'}
      </button>
      {cook.isError && <p className="w-full text-xs text-red-400">{errorText(cook.error)}</p>}
    </div>
  );
}

function AddToPlan({ recipe }) {
  const qc = useQueryClient();
  const week = mondayOf();
  const [day, setDay] = useState((new Date().getDay() + 6) % 7);
  const add = useMutation({
    mutationFn: () => addPlanEntry(week, {
      day,
      recipeId: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
    }),
    onSuccess: (plan) => qc.setQueryData(['planner', week], plan),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={inputBase} aria-label="Day">
        {DAY_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
      </select>
      <button
        onClick={() => add.mutate()}
        disabled={add.isPending}
        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {add.isPending ? 'Adding…' : 'Add to this week’s plan'}
      </button>
      {add.isSuccess && <p className="w-full text-xs text-green-600">Added to {DAY_NAMES[day]}.</p>}
      {add.isError && <p className="w-full text-xs text-red-400">{errorText(add.error)}</p>}
    </div>
  );
}

export default function RecipeActions({ recipe }) {
  const { isPremium } = usePlan();

  return (
    <div className="flex flex-col gap-3 border-t border-gray-800 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cook it</h3>
      <CookPanel recipe={recipe} />
      {isPremium && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Plan it</h3>
          <AddToPlan recipe={recipe} />
        </>
      )}
    </div>
  );
}
