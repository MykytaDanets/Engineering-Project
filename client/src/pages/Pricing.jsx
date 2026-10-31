import { useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { usePlan, useCheckout, usePortal, useCancelSubscription } from '../hooks/usePlan';

const FEATURES = [
  ['Account, pantry management, recipe details', '✓', '✓'],
  ['AI receipt scanning', '3 receipts / month', 'Unlimited'],
  ['Recipe search ranked by pantry match', '10 searches / day', 'Unlimited'],
  ['Expiry dates on pantry items', 'Shown in pantry', '“Use it up” recipes + email reminders'],
  ['Weekly meal planner', '—', '✓'],
  ['Automatic shopping list', '—', '✓'],
  ['In-store shopping mode (works offline)', '—', '✓'],
  ['Shared household pantry & list', '—', 'Up to 6 members, live sync'],
  ['Advertising', 'Consent-based ads', 'No ads'],
];

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

function errorText(mutation) {
  return mutation.error?.response?.data?.message || 'Something went wrong. Try again.';
}

export default function Pricing() {
  const [params] = useSearchParams();
  const justCanceled = params.get('subscription') === 'canceled';
  const { data: plan, isPremium, isLoading } = usePlan({
    refetchInterval: (query) =>
      justCanceled && query.state.data?.plan === 'premium' && !query.state.data?.cancelAtPeriodEnd ? 2000 : false,
  });
  const checkout = useCheckout();
  const portal = usePortal();
  const cancel = useCancelSubscription();

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />

      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Premium unlocks planning, shopping lists and households.</p>
        </div>

        {params.get('canceled') && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm text-gray-400">
            Checkout was cancelled — you have not been charged.
          </div>
        )}

        {justCanceled && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm text-gray-400">
            Your subscription has been cancelled. You keep Premium until the end of the paid period.
          </div>
        )}

        {plan?.graceUntil && plan.subscriptionStatus === 'past_due' && (
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-500">
            Your last payment failed. Premium stays active until {formatDate(plan.graceUntil)} — update your card to keep it.
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-left">
                <th className="px-4 py-3 font-semibold text-gray-300">Feature</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Free</th>
                <th className="px-4 py-3 font-semibold text-green-600">Premium · €3.99/month</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map(([feature, free, premium]) => (
                <tr key={feature} className="border-t border-gray-800">
                  <td className="px-4 py-2.5 text-gray-300">{feature}</td>
                  <td className="px-4 py-2.5 text-gray-500">{free}</td>
                  <td className="px-4 py-2.5 text-gray-300">{premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading your plan…</p>
        ) : isPremium ? (
          <div className="rounded-2xl bg-gray-900 border border-green-900 p-5 flex flex-col gap-3">
            <p className="text-sm text-gray-300">
              You are on <span className="font-semibold text-green-600">Premium</span>.
              {plan.currentPeriodEnd && (
                plan.cancelAtPeriodEnd
                  ? ` It ends on ${formatDate(plan.currentPeriodEnd)}.`
                  : ` Renews on ${formatDate(plan.currentPeriodEnd)}.`
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {portal.isPending ? 'Opening…' : 'Manage subscription'}
              </button>
              {!plan.cancelAtPeriodEnd && (
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 transition"
                >
                  {cancel.isPending ? 'Opening…' : 'Cancel subscription'}
                </button>
              )}
            </div>
            {portal.isError && <p className="text-xs text-red-400">{errorText(portal)}</p>}
            {cancel.isError && <p className="text-xs text-red-400">{errorText(cancel)}</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 flex flex-col gap-3">
            <p className="text-sm text-gray-400">
              You are on the Free plan
              {plan?.remaining?.searches != null && ` · ${plan.remaining.searches} of ${plan.limits.searches} searches left today`}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => checkout.mutate()}
                disabled={checkout.isPending}
                className="rounded-lg bg-green-800 px-5 py-2.5 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition"
              >
                {checkout.isPending ? 'Redirecting…' : 'Upgrade to Premium'}
              </button>
              {plan?.hasBillingAccount && (
                <button
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  Billing history
                </button>
              )}
            </div>
            {checkout.isError && <p className="text-xs text-red-400">{errorText(checkout)}</p>}
            {portal.isError && <p className="text-xs text-red-400">{errorText(portal)}</p>}
            <p className="text-xs text-gray-600">Payments run in Stripe test mode — no real money is taken.</p>
          </div>
        )}
      </main>
    </div>
  );
}
