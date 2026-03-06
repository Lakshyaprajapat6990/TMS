import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Flats from './pages/Flats';
import Tenants from './pages/Tenants';
import RentTracking from './pages/RentTracking';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="flats" element={<Flats />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="rent" element={<RentTracking />} />
      </Route>
    </Routes>
  );
}
