import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import NavBar from '../components/NavBar';
import PremiumGate from '../components/PremiumGate';
import DayRow from '../components/DayRow';
import PreferencesPanel from '../components/PreferencesPanel';
import RecipeModal from '../components/RecipeModal';
import { SuggestionCard, DragPreview } from '../components/MealCard';
import { getPlan, addPlanEntry, updatePlanEntry, deletePlanEntry, autofillPlan } from '../api/planner';
import { refreshFromPlan } from '../offline/shopping';
import { useAuth } from '../context/AuthContext';
import { getRecipes } from '../api/recipes';
import { mondayOf, addDays, shortDate } from '../utils/week';
import { ONE_HOUR } from '../constants';

const errorText = (err) => err?.response?.data?.message || 'Something went wrong';
const DAYS = [0, 1, 2, 3, 4, 5, 6];

function WeekNav({ week, onChange }) {
  const thisWeek = mondayOf();
  return (
    <div className="flex items-center justify-between gap-2">
      <button onClick={() => onChange(addDays(week, -7))} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800">←</button>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-200">{shortDate(week)} – {shortDate(addDays(week, 6))}</p>
        {week !== thisWeek && (
          <button onClick={() => onChange(thisWeek)} className="text-xs text-green-600 hover:text-green-500">Back to this week</button>
        )}
      </div>
      <button onClick={() => onChange(addDays(week, 7))} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800">→</button>
    </div>
  );
}

function PlannerBoard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [week, setWeek] = useState(mondayOf());
  const [dragging, setDragging] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  const planKey = ['planner', week];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const { data: plan, isLoading, isError } = useQuery({ queryKey: planKey, queryFn: () => getPlan(week) });
  const suggestions = useQuery({ queryKey: ['recipes'], queryFn: getRecipes, staleTime: ONE_HOUR, retry: false });

  const setPlan = (data) => qc.setQueryData(planKey, data.plan ?? data);

  const add = useMutation({ mutationFn: (entry) => addPlanEntry(week, entry), onSuccess: setPlan });
  const remove = useMutation({ mutationFn: (entry) => deletePlanEntry(week, entry._id), onSuccess: setPlan });
  const autofill = useMutation({ mutationFn: () => autofillPlan(week), onSuccess: setPlan });
  const makeList = useMutation({
    mutationFn: () => refreshFromPlan(user.id, week),
    onSuccess: () => navigate('/shopping'),
  });

  const update = useMutation({
    mutationFn: ({ entry, changes }) => updatePlanEntry(week, entry._id, changes),
    onMutate: async ({ entry, changes }) => {
      await qc.cancelQueries({ queryKey: planKey });
      const previous = qc.getQueryData(planKey);
      qc.setQueryData(planKey, (old) => ({
        ...old,
        entries: old.entries.map((e) => (e._id === entry._id ? { ...e, ...changes } : e)),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => qc.setQueryData(planKey, context.previous),
    onSuccess: setPlan,
  });

  function handleDragEnd({ active, over }) {
    setDragging(null);
    if (!over) return;
    const day = over.data.current.day;
    const { type, entry, recipe } = active.data.current;

    if (type === 'entry' && entry.day !== day) update.mutate({ entry, changes: { day } });
    if (type === 'recipe') {
      add.mutate({ day, recipeId: recipe.id, title: recipe.title, image: recipe.image, readyInMinutes: recipe.readyInMinutes });
    }
  }

  const errors = [add, update, remove, autofill, makeList].filter((m) => m.isError);
  const entries = plan?.entries ?? [];
  const today = (new Date().getDay() + 6) % 7;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setDragging(active.data.current)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex flex-col gap-5">
        <PreferencesPanel />

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Suggestions from your pantry</h2>
          {suggestions.isLoading && <p className="px-1 text-sm text-gray-500">Finding recipes…</p>}
          {suggestions.isError && <p className="px-1 text-sm text-red-400">{errorText(suggestions.error)}</p>}
          {suggestions.data?.message && <p className="px-1 text-sm text-gray-500">{suggestions.data.message}</p>}
          {suggestions.data?.recipes?.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {suggestions.data.recipes.map((r) => <SuggestionCard key={r.id} recipe={r} />)}
            </div>
          )}
          <p className="px-1 text-xs text-gray-600">Drag a recipe onto a day. On a phone, hold it for a moment first.</p>
        </section>

        <WeekNav week={week} onChange={setWeek} />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => autofill.mutate()}
            disabled={autofill.isPending}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {autofill.isPending ? 'Filling…' : 'Auto-fill empty days'}
          </button>
          <button
            onClick={() => makeList.mutate()}
            disabled={makeList.isPending || !entries.length}
            className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
          >
            {makeList.isPending ? 'Making list…' : 'Make shopping list'}
          </button>
        </div>
        {autofill.isSuccess && autofill.data.filled < autofill.data.emptyDays && (
          <p className="text-xs text-yellow-600">Only {autofill.data.filled} suitable recipes found – add more to your pantry or relax your diet filters.</p>
        )}
        {errors.map((m, i) => <p key={i} className="text-sm text-red-400">{errorText(m.error)}</p>)}

        {isLoading && <p className="text-sm text-gray-500 text-center py-8">Loading plan…</p>}
        {isError && <p className="text-sm text-red-400 text-center py-8">Failed to load the plan.</p>}
        {plan && (
          <div className="flex flex-col gap-2">
            {DAYS.map((day) => (
              <DayRow
                key={day}
                day={day}
                date={addDays(week, day)}
                isToday={week === mondayOf() && day === today}
                entries={entries.filter((e) => e.day === day)}
                onServings={(entry, servings) => update.mutate({ entry, changes: { servings } })}
                onRemove={(entry) => remove.mutate(entry)}
                onOpen={setOpenRecipe}
              />
            ))}
          </div>
        )}
      </div>

      <DragOverlay>
        {dragging && <DragPreview {...(dragging.entry ?? dragging.recipe)} />}
      </DragOverlay>

      {openRecipe && <RecipeModal recipeId={openRecipe} onClose={() => setOpenRecipe(null)} />}
    </DndContext>
  );
}

export default function Planner() {
  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Meal planner</h1>
          <p className="text-sm text-gray-500 mt-1">Plan your week, then turn it into a shopping list.</p>
        </div>
        <PremiumGate feature="The meal planner">
          <PlannerBoard />
        </PremiumGate>
      </main>
    </div>
  );
}
