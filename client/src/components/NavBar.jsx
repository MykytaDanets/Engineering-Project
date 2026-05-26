import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const link = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-green-100 text-green-700'
      : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="mr-3 text-base font-bold text-green-700">🥦 Pantry</span>
          <NavLink to="/pantry" className={link}>My Pantry</NavLink>
          <NavLink to="/recipes" className={link}>Recipes</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
