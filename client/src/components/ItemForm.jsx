import { useState, useEffect } from 'react';
import { CATEGORIES, UNITS } from '../constants';

const EMPTY = { name: '', quantity: '', unit: 'pcs', category: CATEGORIES[0] };

const inputBase = 'rounded-lg border bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-green-700 transition';

export default function ItemForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(initial ?? EMPTY);
    setErrors({});
  }, [initial]);

  function validate() {
    const validationErrors = {};
    if (!form.name.trim()) validationErrors.name = 'Name is required';
    if (form.quantity === '' || isNaN(Number(form.quantity)) || Number(form.quantity) < 0)
      validationErrors.quantity = 'Enter a valid quantity';
    return validationErrors;
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    onSubmit({ ...form, quantity: Number(form.quantity) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Ingredient name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Milk"
            className={`${inputBase} ${errors.name ? 'border-red-500' : 'border-gray-700'}`}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Quantity</label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="0.1"
            value={form.quantity}
            onChange={handleChange}
            placeholder="0"
            className={`${inputBase} ${errors.quantity ? 'border-red-500' : 'border-gray-700'}`}
          />
          {errors.quantity && <p className="text-xs text-red-400">{errors.quantity}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Unit</label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className={`${inputBase} border-gray-700`}
          >
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-400">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className={`${inputBase} border-gray-700`}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-green-800 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
        >
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Add ingredient'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
