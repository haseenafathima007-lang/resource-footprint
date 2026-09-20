import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { AuthPage } from "./components/auth/AuthPage.tsx";
import { AccountPage } from "./components/auth/AccountPage.tsx";
import { Layout } from "./components/layout/Layout.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { OnboardingPage } from "./pages/OnboardingPage.tsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.tsx"));
const LogChangePage = lazy(() => import("./pages/LogChangePage.tsx"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage.tsx"));

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/methodology"
              element={
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center min-h-[50vh]">
                      <p className="text-sm text-ink-muted animate-pulse">Loading methodology...</p>
                    </div>
                  }
                >
                  <MethodologyPage />
                </Suspense>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[50vh]">
                        <p className="text-sm text-ink-muted animate-pulse">Loading dashboard...</p>
                      </div>
                    }
                  >
                    <DashboardPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/log"
              element={
                <ProtectedRoute>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[50vh]">
                        <p className="text-sm text-ink-muted animate-pulse">Loading change logger...</p>
                      </div>
                    }
                  >
                    <LogChangePage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
