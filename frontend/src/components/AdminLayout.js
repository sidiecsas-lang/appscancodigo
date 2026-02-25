import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL } from '../lib/utils';
import { Button } from '../components/ui/button';
import { LayoutDashboard, Package, Users, Camera, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/products', icon: Package, label: 'Productos' },
    { path: '/admin/users', icon: Users, label: 'Usuarios' },
  ];

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        onClick={() => {
          navigate(item.path);
          if (mobile) setMobileMenuOpen(false);
        }}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg mx-2 transition-colors ${
          isActive
            ? 'bg-[#D4A5A5]/10 text-[#D4A5A5]'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
        data-testid={`admin-nav-${item.label.toLowerCase()}`}
      >
        <item.icon size={18} />
        {item.label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-8" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 py-2 shadow-lg">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} mobile />
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => navigate('/scanner')}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg mx-2 w-[calc(100%-1rem)]"
              >
                <Camera size={18} />
                Ir a PWA
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg mx-2 w-[calc(100%-1rem)]"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex-col">
        <div className="p-6 border-b border-gray-100">
          <img src={LOGO_URL} alt="Manrique Importadora" className="h-12" data-testid="admin-logo" />
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">Panel Administrativo</p>
        </div>
        
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>
        
        <div className="border-t border-gray-100 p-4 space-y-2">
          <button
            onClick={() => navigate('/scanner')}
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg w-full transition-colors"
            data-testid="goto-pwa-button"
          >
            <Camera size={18} />
            Ir a PWA
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg w-full transition-colors"
            data-testid="admin-logout-button"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64">
        {children}
      </main>
    </div>
  );
}
