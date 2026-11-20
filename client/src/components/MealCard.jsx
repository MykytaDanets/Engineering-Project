import { useDraggable } from '@dnd-kit/core';

const stepButton = 'h-6 w-6 rounded-md border border-gray-700 text-xs text-gray-400 hover:bg-gray-800 disabled:opacity-40 transition';

export function MealCard({ entry, onServings, onRemove, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry-${entry._id}`,
    data: { type: 'entry', entry },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 rounded-xl bg-gray-900 border border-gray-800 p-2 touch-none cursor-grab ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {entry.image && <img src={entry.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <button onClick={() => onOpen(entry.recipeId)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-gray-100">{entry.title}</p>
        {entry.readyInMinutes && <p className="text-xs text-gray-500">{entry.readyInMinutes} min</p>}
      </button>
      <div className="flex items-center gap-1">
        <button onClick={() => onServings(entry, entry.servings - 1)} disabled={entry.servings <= 1} className={stepButton} aria-label="Fewer servings">−</button>
        <span className="w-12 text-center text-xs text-gray-400">{entry.servings} serv.</span>
        <button onClick={() => onServings(entry, entry.servings + 1)} disabled={entry.servings >= 20} className={stepButton} aria-label="More servings">+</button>
      </div>
      <button onClick={() => onRemove(entry)} className="px-1 text-xs text-gray-500 hover:text-red-400" aria-label={`Remove ${entry.title}`}>✕</button>
    </div>
  );
}

export function SuggestionCard({ recipe }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: 'recipe', recipe },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-36 shrink-0 rounded-xl bg-gray-900 border border-gray-800 p-2 touch-none cursor-grab ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {recipe.image && <img src={recipe.image} alt="" className="mb-1.5 h-16 w-full rounded-lg object-cover" />}
      <p className="line-clamp-2 text-xs font-medium text-gray-200">{recipe.title}</p>
      <p className="mt-0.5 text-xs text-gray-500">{recipe.matchPercent}% match</p>
    </div>
  );
}

export function DragPreview({ title, image }) {
  return (
    <div className="flex w-56 items-center gap-2 rounded-xl bg-gray-800 border border-green-800 p-2 shadow-2xl">
      {image && <img src={image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
      <p className="truncate text-sm font-medium text-gray-100">{title}</p>
    </div>
  );
}
