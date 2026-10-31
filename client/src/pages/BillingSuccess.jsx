import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { usePlan } from '../hooks/usePlan';

const POLL_MS = 2000;
const GIVE_UP_MS = 30000;

export default function BillingSuccess() {
  const [timedOut, setTimedOut] = useState(false);
  const { isPremium } = usePlan({
    refetchInterval: (query) =>
      query.state.data?.plan === 'premium' || timedOut ? false : POLL_MS,
  });

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), GIVE_UP_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-16 text-center flex flex-col items-center gap-4">
        {isPremium ? (
          <>
            <h1 className="text-xl font-bold text-green-600">Welcome to Premium</h1>
            <p className="text-sm text-gray-400">All features are unlocked. Thank you for your support!</p>
            <Link to="/pantry" className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 transition">
              Go to my pantry
            </Link>
          </>
        ) : timedOut ? (
          <>
            <h1 className="text-xl font-bold text-gray-100">Payment received</h1>
            <p className="text-sm text-gray-400">
              Your Premium status is taking longer than usual to activate. Refresh this page in a minute.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-100">Activating Premium…</h1>
            <p className="text-sm text-gray-500">Confirming your payment with Stripe.</p>
          </>
        )}
      </main>
    </div>
  );
}
