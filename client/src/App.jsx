import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Flats from './pages/Flats';
import Tenants from './pages/Tenants';
import RentTracking from './pages/RentTracking';
import SuperAdmin from './pages/SuperAdmin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="buildings" element={<Buildings />} />
          <Route path="flats" element={<Flats />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="rent" element={<RentTracking />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute requireAdmin>
                <SuperAdmin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
