import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import { getRecipes } from '../api/recipes';
import { ONE_HOUR } from '../constants';

export default function Recipes() {
  const [selectedId, setSelectedId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => getRecipes().finally(() => qc.invalidateQueries({ queryKey: ['plan'] })),
    staleTime: ONE_HOUR,
    retry: (count, err) => !err?.response && count < 1,
  });

  const recipes = data?.recipes ?? [];
  const message = data?.message;
  const fromCache = data?.fromCache;
  const limitReached = error?.response?.data?.code === 'LIMIT_REACHED';

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
            {data?.partial && (
              <p className="text-xs text-yellow-600 mt-0.5">Recipes for your expiring items are still coming – press Refresh in a moment.</p>
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

        {isError && limitReached && (
          <div className="rounded-2xl bg-gray-900 border border-green-900 p-6 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-300">{error.response.data.message}</p>
            <Link
              to="/pricing"
              className="rounded-lg bg-green-800 px-5 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 transition"
            >
              See Premium
            </Link>
          </div>
        )}

        {isError && !limitReached && (
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
