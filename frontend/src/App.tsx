import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authStore } from './store/auth.store';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) return <Navigate to="/login" replace />;
  if (!authStore.isAdmin()) return <Navigate to="/" replace />;
  return <>{children}</>;
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
        <Route path="/register" element={isAuth ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout onLogout={() => setIsAuth(false)} />
          </PrivateRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
          <Route path="suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
          <Route path="purchases" element={<AdminRoute><PurchasesPage /></AdminRoute>} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
          <Route path="inventory" element={<AdminRoute><InventoryPage /></AdminRoute>} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
