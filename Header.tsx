import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, ShoppingBag } from 'lucide-react';

export const Header = () => {
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={32} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Paper ඉස්කෝලේ</h1>
              <p className="text-xs text-gray-600">
                {profile?.role === 'admin' ? 'Admin Dashboard' : 'Student Marketplace'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User size={18} className="text-gray-600" />
              <div className="text-right">
                <p className="font-medium text-gray-900">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-gray-600 capitalize">{profile?.role}</p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
