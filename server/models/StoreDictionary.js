const mongoose = require('mongoose');

const storeDictionarySchema = new mongoose.Schema(
  {
    store: { type: String, required: true },//normalised store name, e.g. "biedronka"
    text: { type: String, required: true },//normalised receipt line, e.g. "SER GOUDA PLAST"
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    uses: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

storeDictionarySchema.index({ store: 1, text: 1 }, { unique: true });

module.exports = mongoose.model('StoreDictionary', storeDictionarySchema);
