import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import EventsHelper from './pages/EventsHelper';
import LTVLeaderboard from './pages/LTVLeaderboard';
import Insights from './pages/Insights';
import Login from './pages/Login';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="font-bold text-xl text-indigo-600">ProductIntel</span>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Overview
                </Link>
                <Link to="/events" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Events
                </Link>
                <Link to="/ltv" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  LTV Leaderboard
                </Link>
                <Link to="/insights" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  AI Insights
                </Link>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name || user.email}
                      {isAdmin && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{user.org_name || user.org_id}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Org Context Banner */}
      {user && (
        <div className="bg-indigo-600 text-white text-center py-1 text-sm">
          Viewing analytics for: <strong>{user.org_name || user.org_id}</strong>
          <span className="mx-2">•</span>
          <span className="opacity-75">Plan: {user.org_plan || 'free'}</span>
        </div>
      )}
      
      <main className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/auth/login" element={<Navigate to="/login" replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/events" element={<EventsHelper />} />
                <Route path="/ltv" element={<LTVLeaderboard />} />
                <Route path="/insights" element={<Insights />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
