import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentMarketplace } from './components/StudentMarketplace';
import { PurchaseHistory } from './components/PurchaseHistory';
import { Header } from './components/Header';
import { ShoppingBag, History } from 'lucide-react';

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'marketplace' | 'history'>('marketplace');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Header />

      {!isAdmin && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex gap-4">
              <button
                onClick={() => setCurrentView('marketplace')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === 'marketplace'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShoppingBag size={18} />
                Marketplace
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  currentView === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={18} />
                My Purchases
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="py-8">
        {isAdmin ? (
          <AdminDashboard />
        ) : currentView === 'marketplace' ? (
          <StudentMarketplace />
        ) : (
          <PurchaseHistory />
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
