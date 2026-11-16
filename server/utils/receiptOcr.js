const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

const STORES = ['Biedronka', 'Lidl', 'Żabka', 'Kaufland', 'Carrefour', 'Auchan', 'Netto', 'Dino', 'Stokrotka', 'Aldi', 'Rossmann', 'Lewiatan', 'Polomarket', 'Intermarche', 'Tesco'];

const OCR_WIDTH = 1800;
const THRESHOLD = 160;
const PAGE_MODE = '4';//single column of text
const MAX_OCR_JOBS = 2;

const TOTAL_LINE = /\b(SU[MK]A?|RAZEM|TOTAL|DO ZAP[ŁL]ATY)\b/i;
const SKIP_LINE = /PTU|VAT|NIP|PARAGON|SPRZEDA|ROZLICZ|KARTA|GOTÓWKA|GOTOWKA|RESZTA|KASJER|NR SYS/i;
const DISCOUNT_LINE = /RABAT|OPUST|PROMOCJA/i;
const NON_FOOD = /TORBA|REKLAM[OÓ]WKA|SIATKA|KAUCJA|BUTELKA ZWROTNA/i;
const PRICE = /-?\d+[.,]\d{2}/g;
const LINE_END = String.raw`(-?\d+[.,]\d{2})\S?[\s|:;!.]*$`;
const MULTI_LINE = new RegExp(String.raw`^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[x*×%]\s*\d+[.,]\d{2}\s+` + LINE_END, 'i');
const SIMPLE_LINE = new RegExp(String.raw`^(.+?)\s+` + LINE_END);

const toNumber = (s) => Number(s.replace(',', '.'));

function findStore(lines) {
  const head = lines.slice(0, 8).join(' ').toLowerCase();
  const known = STORES.find((s) => head.includes(s.toLowerCase()));
  return known ?? lines[0] ?? '';
}

function cleanName(text) {
  const tokens = text.split(/\s+/);
  while (tokens.length && !/[a-ząćęłńóśźż]{3,}/i.test(tokens[0])) tokens.shift();
  while (tokens.length > 1 && tokens[tokens.length - 1].length === 1) tokens.pop();
  return tokens.join(' ');
}

function parseReceiptText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const store = findStore(lines);
  const items = [];
  let total = 0;

  for (const line of lines) {
    if (SKIP_LINE.test(line)) continue;

    if (TOTAL_LINE.test(line)) {
      const prices = line.match(PRICE);
      if (prices) {
        total = toNumber(prices[prices.length - 1]);
        break;
      }
      continue;
    }

    if (DISCOUNT_LINE.test(line)) {
      const discount = line.match(/-\d+[.,]\d{2}/);
      if (discount && items.length) items[items.length - 1].price += toNumber(discount[0]);
      continue;
    }

    const multi = line.match(MULTI_LINE);
    const simple = !multi && line.match(SIMPLE_LINE);
    if (!multi && !simple) continue;

    const text = cleanName(multi ? multi[1] : simple[1]);
    if (!/[a-ząćęłńóśźż]{3,}/i.test(text)) continue;

    const count = multi ? toNumber(multi[2]) : 1;
    const weighed = !Number.isInteger(count);
    items.push({
      text,
      name: text.toLowerCase(),
      quantity: count,
      unit: weighed ? 'kg' : 'pcs',
      price: toNumber(multi ? multi[3] : simple[2]),
      category: 'Other',
      isFood: !NON_FOOD.test(text),
      source: 'ocr',
    });
  }

  items.forEach((i) => { i.price = Math.round(i.price * 100) / 100; });
  return { store, date: '', total, lines: items };
}

function prepareImage(buffer) {
  return sharp(buffer)
    .rotate()
    .grayscale()
    .normalize()
    .resize({ width: OCR_WIDTH })
    .threshold(THRESHOLD)
    .png()
    .toBuffer();
}

let running = 0;
const waiting = [];

async function withOcrSlot(fn) {
  if (running < MAX_OCR_JOBS) running++;
  else await new Promise((resolve) => waiting.push(resolve));
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

function readReceiptWithOcr(buffer) {
  return withOcrSlot(() => runOcr(buffer));
}

async function runOcr(buffer) {
  const image = await prepareImage(buffer);
  const worker = await createWorker(['pol', 'eng'], 1, {
    cachePath: path.join(os.tmpdir(), 'tesseract-cache'),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PAGE_MODE });
    const { data } = await worker.recognize(image);
    return parseReceiptText(data.text);
  } finally {
    await worker.terminate();
  }
}

module.exports = { readReceiptWithOcr, parseReceiptText };
