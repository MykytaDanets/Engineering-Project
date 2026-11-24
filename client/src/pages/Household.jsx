import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { useOnline } from '../hooks/useOnline';
import {
  getHousehold, createHousehold, joinHousehold, leaveHousehold, removeMember, newInviteCode, getMe, updateMe,
} from '../api/household';
import { syncShopping } from '../offline/shopping';

const card = 'rounded-2xl bg-gray-900 border border-gray-800 p-5 flex flex-col gap-3';
const inputBase = 'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-green-700';
const primaryBtn = 'rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-green-100 hover:bg-green-700 disabled:opacity-50 transition';
const secondaryBtn = 'rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition';
const errorText = (err) => err?.response?.data?.message || 'Something went wrong';

function useHouseholdMutation(mutationFn) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn,
    onSuccess: (household) => {
      qc.setQueryData(['household'], household);
      qc.invalidateQueries({ predicate: (q) => !['household', 'recipes'].includes(q.queryKey[0]) });
      syncShopping(user.id).catch(() => {});
    },
  });
}

function NoHousehold({ isPremium }) {
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [code, setCode] = useState(params.get('join') ?? '');
  const create = useHouseholdMutation(() => createHousehold(name.trim()));
  const join = useHouseholdMutation(() => joinHousehold(code));

  return (
    <>
      <form className={card} onSubmit={(e) => { e.preventDefault(); join.mutate(); }}>
        <h2 className="text-sm font-semibold text-gray-200">Join a household</h2>
        <p className="text-sm text-gray-500">You’ll share its pantry, meal plan and shopping list. Yours are kept and come back if you leave.</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            maxLength={12}
            className={`${inputBase} min-w-0 flex-1 font-mono tracking-widest`}
          />
          <button type="submit" disabled={!code.trim() || join.isPending} className={primaryBtn}>
            {join.isPending ? 'Joining…' : 'Join'}
          </button>
        </div>
        {join.isError && <p className="text-sm text-red-400">{errorText(join.error)}</p>}
      </form>

      <form className={card} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <h2 className="text-sm font-semibold text-gray-200">Start a household</h2>
        {isPremium ? (
          <>
            <p className="text-sm text-gray-500">Your pantry, meal plan and shopping list become the household’s. Premium covers everyone who joins.</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Flat 4B"
                maxLength={40}
                className={`${inputBase} min-w-0 flex-1`}
              />
              <button type="submit" disabled={!name.trim() || create.isPending} className={primaryBtn}>
                {create.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
            {create.isError && <p className="text-sm text-red-400">{errorText(create.error)}</p>}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Households are part of <Link to="/pricing" className="text-green-600 hover:text-green-500">Premium</Link>.
            You can still join one for free with an invite code.
          </p>
        )}
      </form>
    </>
  );
}

function HouseholdDetails({ household }) {
  const [copied, setCopied] = useState(false);
  const leave = useHouseholdMutation(leaveHousehold);
  const remove = useHouseholdMutation(removeMember);
  const regenerate = useHouseholdMutation(newInviteCode);
  const inviteLink = `${window.location.origin}/household?join=${household.inviteCode}`;
  const others = household.members.filter((m) => !m.isYou);
  const full = household.members.length >= household.maxMembers;

  function copyLink() {
    navigator.clipboard?.writeText(inviteLink).then(() => setCopied(true)).catch(() => {});
  }

  function handleLeave() {
    const text = !others.length
      ? 'You are the only member. The household’s pantry, plan and list become yours, and the ones you had before joining are deleted. Leave?'
      : 'You’ll go back to the pantry, plan and list you had before joining (empty if you started this household). Leave?';
    if (window.confirm(text)) leave.mutate();
  }

  function handleRemove(member) {
    if (window.confirm(`Remove ${member.name} from the household? They get their own pantry, plan and list back.`)) remove.mutate(member.id);
  }

  const errors = [leave, remove, regenerate].filter((m) => m.isError);

  return (
    <>
      <section className={card}>
        <div>
          <h2 className="text-base font-semibold text-gray-100">{household.name}</h2>
          <p className="text-sm text-gray-500">Pantry, meal plan and shopping list are shared and update live.</p>
        </div>
        <ul className="flex flex-col divide-y divide-gray-800">
          {household.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-200">
                  {m.name}
                  {m.isYou && <span className="ml-1.5 text-gray-500">(you)</span>}
                  {m.isOwner && <span className="ml-2 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-600">Owner</span>}
                </p>
                <p className="truncate text-xs text-gray-500">{m.email}</p>
              </div>
              {household.isOwner && !m.isYou && (
                <button onClick={() => handleRemove(m)} disabled={remove.isPending} className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <button onClick={handleLeave} disabled={leave.isPending} className="w-fit rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 transition">
          {leave.isPending ? 'Leaving…' : 'Leave household'}
        </button>
        {errors.map((m, i) => <p key={i} className="text-sm text-red-400">{errorText(m.error)}</p>)}
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-200">Invite someone</h2>
        {full ? (
          <p className="text-sm text-gray-500">The household is full ({household.maxMembers} members).</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Send them this link, or the code to enter on their Household page.</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-gray-800 px-3 py-2 font-mono text-base tracking-widest text-gray-100">{household.inviteCode}</span>
              <button onClick={copyLink} className={secondaryBtn}>{copied ? 'Link copied' : 'Copy link'}</button>
              {household.isOwner && (
                <button onClick={() => { setCopied(false); regenerate.mutate(); }} disabled={regenerate.isPending} className={secondaryBtn}>
                  New code
                </button>
              )}
            </div>
            {household.isOwner && <p className="text-xs text-gray-600">A new code stops the old one from working.</p>}
          </>
        )}
      </section>
    </>
  );
}

function Reminders({ isPremium }) {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const update = useMutation({
    mutationFn: (emailReminders) => updateMe({ emailReminders }),
    onSuccess: (user) => qc.setQueryData(['me'], user),
  });

  return (
    <section className={card}>
      <h2 className="text-sm font-semibold text-gray-200">Expiry reminders</h2>
      {isPremium ? (
        <label className="flex items-start gap-3 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={me?.emailReminders ?? true}
            disabled={!me || update.isPending}
            onChange={(e) => update.mutate(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-green-700 [color-scheme:dark]"
          />
          Email me in the morning when pantry items expire within 2 days. Each item is mentioned once.
        </label>
      ) : (
        <p className="text-sm text-gray-500">
          Email reminders before food expires are part of <Link to="/pricing" className="text-green-600 hover:text-green-500">Premium</Link>.
        </p>
      )}
      {update.isError && <p className="text-sm text-red-400">{errorText(update.error)}</p>}
    </section>
  );
}

export default function Household() {
  const online = useOnline();
  const { isPremium } = usePlan();
  const { data: household, isLoading, isError } = useQuery({ queryKey: ['household'], queryFn: getHousehold, staleTime: 0 });

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Household</h1>
          <p className="text-sm text-gray-500 mt-1">Share your pantry, meal plan and shopping list with the people you live with.</p>
        </div>

        {!online ? (
          <p className="text-sm text-gray-500 text-center py-8">Household settings need a connection.</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-400 text-center py-8">Could not load your household.</p>
        ) : (
          <>
            {household ? <HouseholdDetails household={household} /> : <NoHousehold isPremium={isPremium} />}
            <Reminders isPremium={isPremium} />
          </>
        )}
      </main>
    </div>
  );
}
