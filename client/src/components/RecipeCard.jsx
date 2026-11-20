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

const CHIP_STYLES = {
  have: 'bg-green-900/40 border-green-800 text-green-600',
  partial: 'bg-yellow-900/30 border-yellow-800 text-yellow-600',
  missing: 'bg-red-500/10 border-red-500/20 text-red-400',
};

function Chips({ names, kind }) {
  if (!names.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span key={name} className={`rounded-full border px-2 py-0.5 text-xs ${CHIP_STYLES[kind]}`}>{name}</span>
      ))}
    </div>
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

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-green-700">✓ {recipe.have.length} in pantry</span>
          {recipe.partial.length > 0 && <span className="text-yellow-600">~ {recipe.partial.length} not enough</span>}
          {recipe.missing.length > 0 && <span className="text-red-400">✗ {recipe.missing.length} missing</span>}
          {recipe.readyInMinutes && <span className="text-gray-500">{recipe.readyInMinutes} min</span>}
        </div>

        {recipe.expiring.length > 0 && (
          <span className="w-fit rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
            Uses {recipe.expiring.length} expiring: {recipe.expiring.join(', ')}
          </span>
        )}

        <Chips names={recipe.have} kind="have" />
        <Chips names={recipe.partial} kind="partial" />
        <Chips names={recipe.missing} kind="missing" />
      </div>
    </button>
  );
}
