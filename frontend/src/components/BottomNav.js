import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, FileText, Settings, LogOut, LayoutDashboard } from 'lucide-react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin } = useAuth();

  const navItems = [
    { path: '/scanner', icon: Camera, label: 'Escáner' },
    { path: '/quoter', icon: FileText, label: 'Cotizador' },
    ...(isAdmin ? [{ path: '/admin', icon: LayoutDashboard, label: 'Admin' }] : []),
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 pb-safe"
      data-testid="bottom-nav"
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/admin' && location.pathname.startsWith('/admin'));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? 'text-[#D4A5A5]' : 'text-gray-400'
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-red-400 transition-colors"
          data-testid="nav-logout"
        >
          <LogOut size={22} />
          <span className="text-[10px] mt-1 font-medium">Salir</span>
        </button>
      </div>
    </nav>
  );
}
