import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authStore } from './store/auth.store';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';
import UsersPage from './pages/UsersPage';
import ReturnsPage from './pages/ReturnsPage';
import SuperAdminPage from './pages/SuperAdminPage';
import MySubscriptionPage from './pages/MySubscriptionPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  if (!authStore.isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  if (!authStore.isSuperAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  if (authStore.isSuperAdmin()) {
    return <Navigate to="/super-admin" replace />;
  }
  return <DashboardPage />;
}

export default function App() {
  const [isAuth, setIsAuth] = useState(authStore.isAuthenticated());

  useEffect(() => {
    const handleLogout = () => setIsAuth(false);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <LoginPage onLogin={() => setIsAuth(true)} />} />
        <Route path="/register" element={isAuth ? <Navigate to="/" replace /> : <SetupPage />} />
        <Route path="/forgot-password" element={isAuth ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={isAuth ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout onLogout={() => setIsAuth(false)} />
          </PrivateRoute>
        }>
          <Route index element={<HomeRedirect />} />
          <Route path="super-admin" element={<SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>} />
          <Route path="my-subscription" element={<AdminRoute><MySubscriptionPage /></AdminRoute>} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
          <Route path="purchases" element={<AdminRoute><PurchasesPage /></AdminRoute>} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
          <Route path="inventory" element={<AdminRoute><InventoryPage /></AdminRoute>} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
