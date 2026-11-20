import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';

const link = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-green-900/40 text-green-600'
      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
  }`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const { data: plan, isPremium } = usePlan();
  const qc = useQueryClient();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    qc.clear();
    navigate('/login');
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="mx-auto max-w-2xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap">
          <span className="mr-3 text-sm font-bold text-green-700">Pantry</span>
          <NavLink to="/pantry" className={link}>My Pantry</NavLink>
          <NavLink to="/scan" className={link}>Scan</NavLink>
          <NavLink to="/recipes" className={link}>Recipes</NavLink>
          <NavLink to="/planner" className={link}>Planner</NavLink>
          <NavLink to="/shopping" className={link}>Shopping</NavLink>
          <NavLink to="/pricing" className={link}>{isPremium ? 'Subscription' : 'Upgrade'}</NavLink>
        </div>
        <div className="flex items-center gap-3">
          {isPremium ? (
            <span className="rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-600">Premium</span>
          ) : plan?.remaining?.searches != null && (
            <span className="text-xs text-gray-500">{plan.remaining.searches}/{plan.limits.searches} searches</span>
          )}
          <span className="text-xs text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
