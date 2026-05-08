import { useState, useEffect } from 'react';
import { CATEGORIES, UNITS } from '../constants';

const EMPTY = { name: '', quantity: '', unit: 'pcs', category: 'Produce' };

export default function ItemForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial ?? EMPTY);
    setErrors({});
  }, [initial]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.quantity === '' || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      e.quantity = 'Enter a valid quantity';
    return e;
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    onSubmit({ ...form, quantity: Number(form.quantity) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Ingredient name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Milk"
            className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 ${
              errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Quantity</label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="0.1"
            value={form.quantity}
            onChange={handleChange}
            placeholder="0"
            className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 ${
              errors.quantity ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Unit</label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
          >
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Add ingredient'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
