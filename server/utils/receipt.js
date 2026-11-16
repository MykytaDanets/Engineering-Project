const StoreDictionary = require('../models/StoreDictionary');
const { readReceiptWithAi } = require('./receiptAi');
const { readReceiptWithOcr } = require('./receiptOcr');
const { levenshtein } = require('./text');

const TOTAL_TOLERANCE = 0.02;
const FUZZY_RATIO = 0.4;
const FUZZY_MARGIN = 3;
const MAX_ENTRIES = 5000;

const normalizeStore = (s = '') =>
  s.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/g, ' ').trim();

const normalizeText = (s = '') =>
  s.toUpperCase().replace(/[^A-Z0-9ĄĆĘŁŃÓŚŹŻ%]+/g, ' ').trim();

const round = (n) => Math.round(n * 100) / 100;

async function readReceipt(buffer, mimeType, { useAi = true } = {}) {
  if (!useAi) return { ...(await readReceiptWithOcr(buffer)), reader: 'ocr' };
  try {
    const receipt = await readReceiptWithAi(buffer, mimeType);
    if (receipt.lines.length) return { ...receipt, reader: 'ai' };
    console.warn('Gemini found no products, using Tesseract');
  } catch (err) {
    console.warn('Gemini receipt reading failed, using Tesseract:', err.message);
  }
  return { ...(await readReceiptWithOcr(buffer)), reader: 'ocr' };
}

const foldText = (s) =>
  s.replace(/[ĄĆĘŁŃÓŚŹŻ]/g, (c) => 'ACELNOSZZ'['ĄĆĘŁŃÓŚŹŻ'.indexOf(c)]).replace(/\s+/g, '');

function closestEntry(text, entries) {
  const target = foldText(text);
  const ranked = entries
    .map((e) => ({ entry: e, distance: levenshtein(target, foldText(e.text)) }))
    .sort((a, b) => a.distance - b.distance);
  const [best, second] = ranked;
  if (!best) return null;
  const ratio = best.distance / Math.max(target.length, foldText(best.entry.text).length);
  const clearWinner = !second || second.distance - best.distance >= FUZZY_MARGIN;
  return ratio <= FUZZY_RATIO && clearWinner ? best.entry : null;
}

async function applyDictionary(store, lines) {
  if (!store) return lines;
  const needsFuzzy = lines.some((l) => l.source === 'ocr');
  const query = needsFuzzy ? { store } : { store, text: { $in: lines.map((l) => normalizeText(l.text)) } };
  const entries = await StoreDictionary.find(query).limit(MAX_ENTRIES).lean();
  const known = new Map(entries.map((e) => [e.text, e]));

  return lines.map((line) => {
    const exact = known.get(normalizeText(line.text));
    if (exact) return { ...line, name: exact.name, category: exact.category, source: 'dictionary' };

    const similar = line.source === 'ocr' && closestEntry(normalizeText(line.text), entries);
    return similar ? { ...line, name: similar.name, category: similar.category, source: 'similar' } : line;
  });
}

function lineWarnings(line, total) {
  const warnings = [];
  if (!(line.price > 0)) warnings.push('No price found');
  if (total > 0 && line.price > total) warnings.push('Price is higher than the receipt total');
  if (!line.isFood) warnings.push('Looks like a non-food item');
  if (line.source === 'ocr') warnings.push('Not recognised – check the name and category');
  if (line.source === 'similar') warnings.push('Guessed from a similar line seen before – check it');
  return warnings;
}

async function prepareReceipt(receipt) {
  const store = normalizeStore(receipt.store);
  const lines = await applyDictionary(store, receipt.lines);

  const linesSum = round(lines.reduce((sum, l) => sum + (Number(l.price) || 0), 0));
  const total = round(receipt.total || 0);
  const difference = round(total - linesSum);

  return {
    store: receipt.store,
    date: receipt.date,
    reader: receipt.reader,
    total,
    linesSum,
    difference,
    totalMatches: total > 0 && Math.abs(difference) <= TOTAL_TOLERANCE,
    lines: lines.map((line, i) => ({
      id: i,
      text: line.text,
      name: line.name,
      quantity: line.quantity > 0 ? line.quantity : 1,
      unit: line.unit,
      category: line.category,
      price: round(Number(line.price) || 0),
      isFood: line.isFood,
      source: line.source,
      warnings: lineWarnings(line, total),
      add: line.isFood,
    })),
  };
}

async function learnCorrections(store, items, userId) {
  const key = normalizeStore(store);
  const corrections = items.filter((i) => i.corrected && i.text);
  if (!key || !corrections.length) return 0;

  await StoreDictionary.bulkWrite(corrections.map((i) => ({
    updateOne: {
      filter: { store: key, text: normalizeText(i.text) },
      update: { $set: { name: i.name, category: i.category, updatedBy: userId }, $inc: { uses: 1 } },
      upsert: true,
    },
  })));
  return corrections.length;
}

module.exports = { readReceipt, prepareReceipt, learnCorrections };
