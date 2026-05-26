import { useQuery } from '@tanstack/react-query';
import { getRecipeInfo } from '../api/recipes';

export default function RecipeModal({ recipeId, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recipe-info', recipeId],
    queryFn: () => getRecipeInfo(recipeId),
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 text-gray-500 hover:bg-gray-100"
        >
          ✕
        </button>

        {isLoading && (
          <div className="flex items-center justify-center p-16 text-gray-400 text-sm">
            Loading recipe…
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-sm text-red-500">
            Could not load recipe details.
          </div>
        )}

        {data && (
          <>
            {data.image && (
              <img
                src={data.image}
                alt={data.title}
                className="w-full h-52 object-cover rounded-t-2xl"
              />
            )}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{data.title}</h2>
                <div className="mt-1 flex gap-4 text-xs text-gray-500">
                  {data.readyInMinutes && <span>⏱ {data.readyInMinutes} min</span>}
                  {data.servings && <span>🍽 {data.servings} servings</span>}
                </div>
              </div>

              {data.summary && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                  {data.summary}
                </p>
              )}

              {data.ingredients?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Ingredients
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {data.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-gray-700">• {ing}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.instructions && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Instructions
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {data.instructions}
                  </p>
                </div>
              )}

              {data.sourceUrl && (
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-center rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  View full recipe ↗
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
