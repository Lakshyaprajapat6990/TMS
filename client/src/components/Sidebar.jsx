import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/buildings', label: 'Buildings', icon: '🏢' },
    { to: '/flats', label: 'Flats', icon: '🏠' },
    { to: '/tenants', label: 'Tenants', icon: '👥' },
    { to: '/rent', label: 'Rent Tracking', icon: '💰' },
    ...(isSuperAdmin ? [{ to: '/admin', label: 'Admin Panel', icon: '🔧' }] : []),
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">🏗️</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">TenantHub</h1>
              <p className="text-xs text-gray-400">Property Management</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        {user && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
            {isSuperAdmin && (
              <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Super Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition-colors text-left px-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
