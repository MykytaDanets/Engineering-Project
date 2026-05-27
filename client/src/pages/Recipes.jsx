import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { getRecipes } from '../api/recipes';
import { ONE_HOUR } from '../constants';

export default function Recipes() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
    staleTime: ONE_HOUR,
    retry: 1,
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
