import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import ItemForm from '../components/ItemForm';
import { getPantryItems, addPantryItem, updatePantryItem, deletePantryItem } from '../api/pantry';

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export default function Pantry() {
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['pantry'],
    queryFn: getPantryItems,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['pantry'] });

  const addMutation = useMutation({
    mutationFn: addPantryItem,
    onSuccess: () => { invalidate(); setShowAdd(false); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => updatePantryItem(id, data),
    onSuccess: () => { invalidate(); setEditingItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePantryItem,
    onSuccess: invalidate,
  });

  const grouped = groupByCategory(items);

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">

        {showAdd ? (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">New ingredient</h2>
            <ItemForm
              onSubmit={(data) => addMutation.mutate(data)}
              onCancel={() => setShowAdd(false)}
              loading={addMutation.isPending}
            />
            {addMutation.isError && (
              <p className="mt-2 text-xs text-red-400">{addMutation.error?.response?.data?.message || 'Failed to add item'}</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 w-fit transition"
          >
            <span className="text-base leading-none">+</span> Add ingredient
          </button>
        )}

        {isLoading && (
          <p className="text-sm text-gray-500 text-center py-8">Loading pantry…</p>
        )}

        {isError && (
          <p className="text-sm text-red-400 text-center py-8">Failed to load pantry. Check your connection.</p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-10 text-center">
            <p className="font-medium text-gray-300">Your pantry is empty</p>
            <p className="text-sm mt-1 text-gray-500">Add your first ingredient above</p>
          </div>
        )}

        {Object.entries(grouped).map(([category, catItems]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <div key={item._id}>
                  {editingItem?._id === item._id ? (
                    <div className="rounded-xl bg-gray-900 border border-gray-700 p-4">
                      <ItemForm
                        initial={{ name: item.name, quantity: String(item.quantity), unit: item.unit, category: item.category }}
                        onSubmit={(data) => editMutation.mutate({ id: item._id, data })}
                        onCancel={() => setEditingItem(null)}
                        loading={editMutation.isPending}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-700 transition">
                      <div>
                        <span className="text-sm font-medium text-gray-100">{item.name}</span>
                        <span className="ml-2 text-sm text-gray-500">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowAdd(false); setEditingItem(item); }}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-gray-400 border border-gray-700 hover:bg-gray-800 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item._id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-red-400 border border-red-900 hover:bg-red-950 disabled:opacity-50 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
