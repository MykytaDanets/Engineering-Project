const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },

    stripeCustomerId: { type: String, index: true, sparse: true },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: { type: String, default: 'none' },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    graceUntil: { type: Date },

    usage: {
      searchesDay: { type: String, default: '' },//YYYY-MM-DD
      searchesCount: { type: Number, default: 0 },
      receiptsMonth: { type: String, default: '' },//YYYY-MM
      receiptsCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
