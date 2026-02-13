import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    org_id: 'org_alpha',
    first_name: '',
    last_name: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        await register(formData);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts for quick login
  const demoAccounts = [
    { email: 'admin@alpha.com', name: 'Alpha SaaS (Admin)', org: 'B2B SaaS' },
    { email: 'admin@beta.com', name: 'Beta Commerce (Admin)', org: 'E-commerce' },
    { email: 'admin@gamma.com', name: 'Gamma Learning (Admin)', org: 'EdTech' },
  ];

  const quickLogin = (email) => {
    setFormData({ ...formData, email, password: 'demo123' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Title */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            ProductIntel
          </h1>
          <p className="mt-2 text-indigo-200">
            AI-Powered Product Intelligence Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isRegistering ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization</label>
                <select
                  name="org_id"
                  value={formData.org_id}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="org_alpha">Alpha SaaS Inc. (B2B)</option>
                  <option value="org_beta">Beta Commerce (E-commerce)</option>
                  <option value="org_gamma">Gamma Learning (EdTech)</option>
                  <option value="org_test">Test Organization</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        {/* Demo Accounts */}
        {!isRegistering && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Demo Login</h3>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => quickLogin(account.email)}
                  className="w-full text-left px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <span className="block text-white font-medium">{account.name}</span>
                  <span className="block text-indigo-200 text-xs">{account.org} • {account.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-indigo-200 text-center">
              Password for all demo accounts: <code className="bg-black/20 px-1 rounded">demo123</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
