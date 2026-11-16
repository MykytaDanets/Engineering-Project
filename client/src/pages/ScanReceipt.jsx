import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import ReceiptLine from '../components/ReceiptLine';
import { scanReceipt, confirmReceipt } from '../api/receipts';
import { resizeImage } from '../utils/resizeImage';
import { usePlan } from '../hooks/usePlan';

function errorText(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

function toEditable(receipt) {
  return receipt.lines.map((line) => ({
    ...line,
    expiryDate: '',
    originalName: line.name,
    originalCategory: line.category,
  }));
}

function TotalCheck({ receipt }) {
  if (receipt.totalMatches) {
    return (
      <div className="rounded-xl bg-green-900/20 border border-green-900 px-4 py-3 text-sm text-green-600">
        Total checked: lines add up to {receipt.total.toFixed(2)}.
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-500">
      {receipt.total > 0
        ? `Lines add up to ${receipt.linesSum.toFixed(2)}, but the receipt total is ${receipt.total.toFixed(2)} (difference ${receipt.difference.toFixed(2)}). Some lines may be missing or misread – check them below.`
        : `The receipt total could not be read. Lines add up to ${receipt.linesSum.toFixed(2)} – check them below.`}
    </div>
  );
}

export default function ScanReceipt() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const { data: plan } = usePlan();

  const [receipt, setReceipt] = useState(null);
  const [lines, setLines] = useState([]);
  const [store, setStore] = useState('');

  const scan = useMutation({
    mutationFn: async (file) => scanReceipt(await resizeImage(file)),
    onSuccess: (data) => {
      setReceipt(data);
      setLines(toEditable(data));
      setStore(data.store);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['plan'] }),
  });

  const confirm = useMutation({
    mutationFn: confirmReceipt,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      navigate('/pantry');
    },
  });

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) scan.mutate(file);
  }

  function reset() {
    setReceipt(null);
    setLines([]);
    scan.reset();
    confirm.reset();
  }

  function updateLine(updated) {
    setLines((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  function handleConfirm() {
    const items = lines
      .filter((l) => l.add)
      .map((l) => ({
        text: l.text,
        name: l.name.trim(),
        quantity: Number(l.quantity),
        unit: l.unit,
        category: l.category,
        expiryDate: l.expiryDate || null,
        corrected: l.name.trim().toLowerCase() !== l.originalName.toLowerCase() || l.category !== l.originalCategory,
      }));
    confirm.mutate({ store, items });
  }

  const selected = lines.filter((l) => l.add).length;
  const scansLeft = plan?.remaining?.receipts;

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Scan a receipt</h1>
          <p className="text-sm text-gray-500 mt-1">
            Take a photo of your shopping receipt and add everything to your pantry at once.
            {scansLeft > 0 && ` ${scansLeft} of ${plan.limits.receipts} free AI scans left this month.`}
          </p>
        </div>

        {scansLeft === 0 && !receipt && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm text-gray-400 flex flex-wrap items-center justify-between gap-3">
            <span>
              You have used your {plan.limits.receipts} AI scans this month. You can keep scanning with basic reading – free
              and unlimited, but less accurate.
            </span>
            <Link to="/pricing" className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 transition">
              Get unlimited AI scans
            </Link>
          </div>
        )}

        {!receipt && !scan.isPending && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-gray-400">Lay the receipt flat, in good light, with the whole receipt in the photo.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => cameraInput.current.click()}
                className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 transition"
              >
                Take photo
              </button>
              <button
                onClick={() => galleryInput.current.click()}
                className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition"
              >
                Choose from gallery
              </button>
            </div>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            <input ref={galleryInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />

            {scan.isError && (
              <p className="text-sm text-red-400">{errorText(scan.error, 'Could not read the receipt.')}</p>
            )}
            <p className="text-xs text-gray-600">The photo is only used to read the receipt and is deleted straight away.</p>
          </div>
        )}

        {scan.isPending && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-10 text-center">
            <p className="font-medium text-gray-300">Reading your receipt…</p>
            <p className="text-sm mt-1 text-gray-500">This usually takes 5–20 seconds.</p>
          </div>
        )}

        {receipt && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400">Store</label>
                <input
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>
              {receipt.date && <span className="pb-2 text-sm text-gray-500">{receipt.date}</span>}
              <span
                className={`mb-2 rounded-full px-2 py-0.5 text-xs ${
                  receipt.reader === 'ai' ? 'bg-gray-800 text-gray-400' : 'bg-yellow-900/50 text-yellow-600'
                }`}
              >
                {receipt.reader === 'ai'
                  ? 'Read by AI'
                  : receipt.basic
                    ? 'Basic reading – check carefully'
                    : 'Read with backup OCR – check carefully'}
              </span>
            </div>

            <TotalCheck receipt={receipt} />

            <p className="text-xs text-gray-500">
              Fix any names or categories that are wrong – they are remembered for this store next time.
            </p>

            <div className="flex flex-col gap-2">
              {lines.map((line) => (
                <ReceiptLine key={line.id} line={line} onChange={updateLine} />
              ))}
            </div>

            {confirm.isError && (
              <p className="text-sm text-red-400">{errorText(confirm.error, 'Could not add the items.')}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleConfirm}
                disabled={!selected || confirm.isPending}
                className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
              >
                {confirm.isPending ? 'Adding…' : `Add ${selected} item${selected === 1 ? '' : 's'} to pantry`}
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 transition"
              >
                Scan another
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
