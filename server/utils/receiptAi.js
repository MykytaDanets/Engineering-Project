const { GoogleGenAI } = require('@google/genai');
const { CATEGORIES } = require('../config/pantry');

const TIMEOUT_MS = 20000;
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'];
const RETRYABLE = [429, 500, 503, 504];

let client = null;

function gemini() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  client = new GoogleGenAI({ apiKey });
  return client;
}

const PROMPT = `You read photos of supermarket receipts (often Polish). Return every purchased product line.
- text: the product name exactly as printed, without quantity, price or tax letter.
- name: short generic English ingredient name that a recipe search understands, lowercase and singular (e.g. "SER GOUDA PLAST" -> "gouda cheese", "MLEKO UHT 3,2% 1L" -> "milk").
- quantity and unit: the amount bought, for a pantry. Use the pack size printed in the name times the count (2 x MLEKO 1L -> 2 and "L"). Weighed items in "kg". Otherwise the number of pieces with "pcs".
- price: the final amount paid for the line after discounts. Apply RABAT/OPUST/discount lines to the product above them and do not return them as lines.
- category: the best fitting category.
- isFood: false for bags, bottle deposits (kaucja), cosmetics, cleaning products and other non-food items.
- total: the amount on the SUMA / TOTAL line. store: the chain name only (e.g. "Biedronka", "Lidl"). date: YYYY-MM-DD, or "" if unreadable.
If the photo is not a receipt, return an empty lines array.`;

const SCHEMA = {
  type: 'object',
  properties: {
    store: { type: 'string' },
    date: { type: 'string' },
    total: { type: 'number' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string', enum: ['pcs', 'g', 'kg', 'ml', 'L'] },
          price: { type: 'number' },
          category: { type: 'string', enum: CATEGORIES },
          isFood: { type: 'boolean' },
        },
        required: ['text', 'name', 'quantity', 'unit', 'price', 'category', 'isFood'],
      },
    },
  },
  required: ['store', 'date', 'total', 'lines'],
};

function modelsToTry() {
  const preferred = process.env.GEMINI_MODEL;
  return preferred ? [preferred, ...MODELS.filter((m) => m !== preferred)] : MODELS;
}

async function readReceiptWithAi(buffer, mimeType) {
  let lastError;
  for (const model of modelsToTry()) {
    try {
      return await callModel(model, buffer, mimeType);
    } catch (err) {
      lastError = err;
      const retryable = RETRYABLE.includes(err.status) || err.name === 'AbortError' || err.name === 'TimeoutError';
      if (!retryable) throw err;
      console.warn(`Gemini ${model} unavailable (${err.status ?? err.name}), trying next model`);
    }
  }
  throw lastError;
}

async function callModel(model, buffer, mimeType) {
  const response = await gemini().models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: buffer.toString('base64') } },
        { text: PROMPT },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: SCHEMA,
      temperature: 0,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  const data = JSON.parse(response.text);
  return {
    store: data.store || '',
    date: data.date || '',
    total: Number(data.total) || 0,
    lines: (data.lines ?? []).map((l) => ({ ...l, source: 'ai' })),
  };
}

module.exports = { readReceiptWithAi };
