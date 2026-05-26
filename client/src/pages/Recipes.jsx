import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import RecipeModal from '../components/RecipeModal';
import { getRecipes } from '../api/recipes';

function MatchBadge({ percent }) {
  const color =
    percent >= 80 ? 'bg-green-100 text-green-700' :
    percent >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {percent}% match
    </span>
  );
}

function RecipeCard({ recipe, onSelect }) {
  return (
    <button
      onClick={() => onSelect(recipe.id)}
      className="w-full text-left rounded-2xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800 leading-snug">{recipe.title}</h3>
          <MatchBadge percent={recipe.matchPercent} />
        </div>

        <div className="flex gap-3 text-xs text-gray-500">
          <span className="text-green-600 font-medium">✓ {recipe.usedIngredientCount} in pantry</span>
          {recipe.missedIngredientCount > 0 && (
            <span className="text-red-500">✗ {recipe.missedIngredientCount} missing</span>
          )}
        </div>

        {recipe.missedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {recipe.missedIngredients.map((ing) => (
              <span
                key={ing}
                className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500"
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
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recipe Suggestions</h1>
            {fromCache && (
              <p className="text-xs text-gray-400 mt-0.5">Cached results · updates hourly</p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isFetching ? 'Searching…' : 'Refresh'}
          </button>
        </div>

        {isLoading && (
          <div className="py-20 text-center text-gray-400 text-sm">
            Finding recipes for your pantry…
          </div>
        )}

        {isError && (
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">
              {error?.response?.data?.message || 'Failed to load recipes'}
            </p>
            {error?.response?.data?.message?.includes('SPOONACULAR') && (
              <p className="mt-2 text-xs text-red-400">
                Add your Spoonacular API key to <code className="bg-red-100 px-1 rounded">server/.env</code>
              </p>
            )}
          </div>
        )}

        {!isLoading && !isError && message && recipes.length === 0 && (
          <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-gray-400">
            <p className="text-3xl mb-2">🥦</p>
            <p className="font-medium">{message}</p>
          </div>
        )}

        {recipes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
