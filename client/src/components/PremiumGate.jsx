import { Link } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';

export default function PremiumGate({ feature, children }) {
  const { isPremium, isLoading } = usePlan();

  if (isLoading) return <p className="text-sm text-gray-500 text-center py-8">Loading…</p>;
  if (isPremium) return children;

  return (
    <div className="rounded-2xl bg-gray-900 border border-green-900 p-8 flex flex-col items-center gap-3 text-center">
      <p className="font-medium text-gray-200">{feature} is part of Premium</p>
      <p className="text-sm text-gray-500">Upgrade for €3.99/month to plan your week and get your shopping list made for you.</p>
      <Link
        to="/pricing"
        className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 transition"
      >
        See Premium
      </Link>
    </div>
  );
}
