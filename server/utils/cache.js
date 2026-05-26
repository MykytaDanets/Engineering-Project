const store = new Map();

const ONE_HOUR = 60 * 60 * 1000;

module.exports = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > ONE_HOUR) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },
  set(key, data) {
    store.set(key, { data, at: Date.now() });
  },
};
