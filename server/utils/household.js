const crypto = require('crypto');
const Pantry = require('../models/Pantry');
const ShoppingList = require('../models/ShoppingList');
const MealPlan = require('../models/MealPlan');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';//no 0/O, 1/I
const CODE_LENGTH = 8;

function newInviteCode() {
  return Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
}

async function moveData(fromId, toId) {
  await Promise.all([
    Pantry.updateOne({ userId: fromId }, { $set: { userId: toId } }),
    ShoppingList.updateOne({ userId: fromId }, { $set: { userId: toId } }),
    MealPlan.updateMany({ userId: fromId }, { $set: { userId: toId } }),
  ]);
}

async function deleteData(ownerId) {
  await Promise.all([
    Pantry.deleteOne({ userId: ownerId }),
    ShoppingList.deleteOne({ userId: ownerId }),
    MealPlan.deleteMany({ userId: ownerId }),
  ]);
}

module.exports = { newInviteCode, moveData, deleteData };
