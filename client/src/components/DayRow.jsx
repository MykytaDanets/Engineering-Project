import { useDroppable } from '@dnd-kit/core';
import { MealCard } from './MealCard';
import { DAY_NAMES, shortDate } from '../utils/week';

export default function DayRow({ day, date, isToday, entries, onServings, onRemove, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day } });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border p-3 transition ${
        isOver ? 'border-green-700 bg-green-900/10' : 'border-gray-800 bg-gray-950'
      }`}
    >
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className={`text-sm font-semibold ${isToday ? 'text-green-600' : 'text-gray-300'}`}>{DAY_NAMES[day]}</span>
        <span className="text-xs text-gray-500">{shortDate(date)}</span>
      </h2>
      {entries.length ? (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <MealCard key={entry._id} entry={entry} onServings={onServings} onRemove={onRemove} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <p className="px-1 py-2 text-xs text-gray-600">Drag a recipe here</p>
      )}
    </section>
  );
}
