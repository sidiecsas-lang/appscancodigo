import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import LoginPage from "./pages/LoginPage";
import ScannerPage from "./pages/ScannerPage";
import QuoterPage from "./pages/QuoterPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4A5A5] border-t-transparent mx-auto"></div>
          <p className="text-gray-500 mt-4">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/scanner" replace />;
  }
  
  return children;
};

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#1A1A1A] text-white p-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom">
      <p className="text-sm font-medium">Instalar Manrique App</p>
      <p className="text-xs text-gray-400 mt-1">Accede más rápido desde tu pantalla de inicio</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowPrompt(false)}
          className="flex-1 py-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Ahora no
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-2 bg-[#D4A5A5] text-[#1A1A1A] rounded-lg text-xs font-medium hover:bg-[#C29090] transition-colors"
        >
          Instalar
        </button>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, loading } = useAuth();

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          loading ? null : (user ? <Navigate to={user.role === 'admin' ? '/admin' : '/scanner'} replace /> : <LoginPage />)
        } />
        
        {/* PWA Routes */}
        <Route path="/scanner" element={
          <ProtectedRoute>
            <ScannerPage />
          </ProtectedRoute>
        } />
        <Route path="/quoter" element={
          <ProtectedRoute>
            <QuoterPage />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute adminOnly>
            <AdminProducts />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly>
            <AdminUsers />
          </ProtectedRoute>
        } />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      <PWAInstallPrompt />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
