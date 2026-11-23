const HEALTH_URL = `${import.meta.env.VITE_API_URL || ''}/api/health`;
const PROBE_MS = 15000;

let reachable = true;
let probe = null;
const listeners = new Set();

// no response, or a proxy/gateway error page instead of JSON
export const isUnreachable = (err) =>
  err?.code !== 'ERR_CANCELED' && (!err?.response || typeof err.response.data !== 'object');

export const isReachable = () => reachable;

export function subscribeReachable(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setReachable(value) {
  if (value === reachable) return;
  reachable = value;
  if (!value && !probe) probe = setInterval(checkServer, PROBE_MS);
  if (value && probe) {
    clearInterval(probe);
    probe = null;
  }
  listeners.forEach((l) => l());
}

function checkServer() {
  if (!navigator.onLine) return;
  fetch(HEALTH_URL, { cache: 'no-store' })
    .then((res) => res.ok && setReachable(true))
    .catch(() => {});
}

window.addEventListener('online', checkServer);
