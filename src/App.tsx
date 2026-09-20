import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { ProtectedRoute } from "./components/auth/ProtectedRoute.tsx";
import { AuthPage } from "./components/auth/AuthPage.tsx";
import { AccountPage } from "./components/auth/AccountPage.tsx";
import { Layout } from "./components/layout/Layout.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
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
