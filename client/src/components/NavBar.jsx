import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const link = ({ isActive }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-green-900/40 text-green-600'
      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
  }`;

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="mr-3 text-sm font-bold text-green-700">Pantry</span>
          <NavLink to="/pantry" className={link}>My Pantry</NavLink>
          <NavLink to="/recipes" className={link}>Recipes</NavLink>
        </div>
        <div className="flex items-center gap-3">
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
