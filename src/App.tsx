import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { AccountPage } from './components/auth/AccountPage.tsx';

function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-gray-200 rounded-lg text-center shadow-sm">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Resource Footprint</h1>
      <p className="text-gray-600 mb-8">
        Measure, understand, and reduce water (L) and energy (kWh).
      </p>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 mb-8 inline-block text-left">
        <p className="font-semibold">Phase 2: Supabase Backend & Auth Layer</p>
        <p className="text-xs text-emerald-700 mt-1">
          Database schema, Row-Level Security, append-only baselines, and typed repositories are active.
        </p>
      </div>

      <div className="flex justify-center gap-4">
        {loading ? (
          <span className="text-gray-400">Loading...</span>
        ) : user ? (
          <>
            <Link
              to="/account"
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700"
            >
              Go to Account ({user.email})
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/auth"
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700"
            >
              Sign In / Register
            </Link>
            <Link
              to="/account"
              className="px-4 py-2 bg-gray-100 border text-gray-700 font-medium rounded-md hover:bg-gray-200"
            >
              Try Protected Account Route
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between">
          <nav className="border-b bg-white px-6 py-4 flex items-center justify-between">
            <Link to="/" className="font-bold text-lg text-emerald-700">
              Resource Footprint
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link to="/account" className="text-gray-600 hover:text-gray-900">
                Account
              </Link>
            </div>
          </nav>

          <main className="flex-1 px-4">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          <footer className="border-t py-4 text-center text-xs text-gray-500 bg-white">
            Resource Footprint &middot; Phase 2
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
