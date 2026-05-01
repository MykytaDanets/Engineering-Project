import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Pantry() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Pantry</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-gray-400">
          <p className="text-lg font-medium">Pantry feature coming in Week 2</p>
          <p className="mt-1 text-sm">Auth is working — you are logged in!</p>
        </div>
      </div>
    </div>
  );
}
