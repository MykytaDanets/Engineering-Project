import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import ItemForm from '../components/ItemForm';
import { getPantryItems, addPantryItem, updatePantryItem, deletePantryItem } from '../api/pantry';

const CATEGORY_EMOJI = {
  'Produce': '🥦',
  'Dairy': '🥛',
  'Meat & Fish': '🥩',
  'Grains & Pasta': '🌾',
  'Canned & Dry': '🥫',
  'Condiments': '🧴',
  'Beverages': '🥤',
  'Other': '📦',
};

export default function Pantry() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Group items by category
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Pantry</h1>
            <p className="text-xs text-gray-500">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">

        {/* Add ingredient panel */}
        {showAdd ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-green-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">New ingredient</h2>
            <ItemForm
              onSubmit={(data) => addMutation.mutate(data)}
              onCancel={() => setShowAdd(false)}
              loading={addMutation.isPending}
            />
            {addMutation.isError && (
              <p className="mt-2 text-xs text-red-500">{addMutation.error?.response?.data?.message || 'Failed to add item'}</p>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 w-fit shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Add ingredient
          </button>
        )}

        {/* Items list */}
        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-8">Loading pantry…</p>
        )}

        {isError && (
          <p className="text-sm text-red-500 text-center py-8">Failed to load pantry. Check your connection.</p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-gray-400">
            <p className="text-3xl mb-2">🛒</p>
            <p className="font-medium">Your pantry is empty</p>
            <p className="text-sm mt-1">Add your first ingredient above</p>
          </div>
        )}

        {Object.entries(grouped).map(([category, catItems]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
              {CATEGORY_EMOJI[category] ?? '📦'} {category}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <div key={item._id}>
                  {editingItem?._id === item._id ? (
                    <div className="rounded-xl bg-white p-4 shadow-sm border border-green-100">
                      <ItemForm
                        initial={{ name: item.name, quantity: String(item.quantity), unit: item.unit, category: item.category }}
                        onSubmit={(data) => editMutation.mutate({ id: item._id, data })}
                        onCancel={() => setEditingItem(null)}
                        loading={editMutation.isPending}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        <span className="ml-2 text-sm text-gray-500">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowAdd(false); setEditingItem(item); }}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item._id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg px-3 py-1 text-xs font-medium text-red-500 border border-red-100 hover:bg-red-50 disabled:opacity-50"
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
