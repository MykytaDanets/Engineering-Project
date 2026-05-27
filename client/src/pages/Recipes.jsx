import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import RecipeModal from '../components/RecipeModal';
import { getRecipes } from '../api/recipes';

function MatchBadge({ percent }) {
  const color =
    percent >= 80 ? 'bg-green-900/50 text-green-600' :
    percent >= 50 ? 'bg-yellow-900/50 text-yellow-600' :
                    'bg-red-900/50 text-red-500';
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {percent}%
    </span>
  );
}

function RecipeCard({ recipe, onSelect }) {
  return (
    <button
      onClick={() => onSelect(recipe.id)}
      className="w-full text-left flex gap-3 rounded-xl bg-gray-900 border border-gray-800 p-3 hover:border-gray-600 transition"
    >
      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      )}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-100 leading-snug truncate">{recipe.title}</h3>
          <MatchBadge percent={recipe.matchPercent} />
        </div>

        <div className="flex gap-3 text-xs">
          <span className="text-green-700">✓ {recipe.usedIngredientCount} in pantry</span>
          {recipe.missedIngredientCount > 0 && (
            <span className="text-red-400">✗ {recipe.missedIngredientCount} missing</span>
          )}
        </div>

        {recipe.usedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.usedIngredients.map((ing) => (
              <span
                key={ing}
                className="rounded-full bg-green-900/40 border border-green-800 px-2 py-0.5 text-xs text-green-600"
              >
                {ing}
              </span>
            ))}
          </div>
        )}

        {recipe.missedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.missedIngredients.map((ing) => (
              <span
                key={ing}
                className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400"
              >
                {ing}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function Recipes() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const recipes = data?.recipes ?? [];
  const message = data?.message;
  const fromCache = data?.fromCache;

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Recipe Suggestions</h1>
            {fromCache && (
              <p className="text-xs text-gray-500 mt-0.5">Cached results · updates hourly</p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50 transition"
          >
            {isFetching ? 'Searching…' : 'Refresh'}
          </button>
        </div>

        {isLoading && (
          <div className="py-20 text-center text-gray-500 text-sm">
            Finding recipes for your pantry…
          </div>
        )}

        {isError && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
            <p className="text-sm font-medium text-red-400">
              {error?.response?.data?.message || 'Failed to load recipes'}
            </p>
            {error?.response?.data?.message?.includes('SPOONACULAR') && (
              <p className="mt-2 text-xs text-red-500">
                Add your Spoonacular API key to <code className="bg-red-500/10 px-1 rounded">server/.env</code>
              </p>
            )}
          </div>
        )}

        {!isLoading && !isError && message && recipes.length === 0 && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-10 text-center">
            <p className="font-medium text-gray-300">{message}</p>
          </div>
        )}

        {recipes.length > 0 && (
          <div className="flex flex-col gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </main>

      {selectedId && (
        <RecipeModal
          recipeId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
