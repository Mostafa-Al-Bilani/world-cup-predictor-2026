import { Toaster } from 'react-hot-toast';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from './components/AdminRoute';
import { PasswordRecoveryRedirect } from './components/PasswordRecoveryRedirect';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ConfigurationErrorPage } from './pages/ConfigurationErrorPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { MyPredictionsPage } from './pages/MyPredictionsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { hasSupabaseConfigurationError } from './services/supabaseClient';

export function App() {
  if (hasSupabaseConfigurationError) {
    return <ConfigurationErrorPage />;
  }

  return (
    <AuthProvider>
      <HashRouter>
        <PasswordRecoveryRedirect />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="scoreboard" element={<ScoreboardPage />} />
            <Route
              path="my-predictions"
              element={
                <ProtectedRoute>
                  <MyPredictionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
          },
        }}
      />
    </AuthProvider>
  );
}
