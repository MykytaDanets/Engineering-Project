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

export default function RecipeCard({ recipe, onSelect }) {
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
