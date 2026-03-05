import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleUserCodeChange = useCallback((e) => {
    setUserCode(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userCode || !password) {
      toast.error('Por favor ingrese sus credenciales');
      return;
    }
    
    setLoading(true);
    try {
      const user = await login(userCode, password);
      toast.success(`Bienvenido, ${user.user_code}`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/scanner');
      }
    } catch (error) {
      toast.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white">
        <CardHeader className="text-center pb-2 pt-8">
          <img 
            src={LOGO_URL} 
            alt="Manrique Importadora" 
            className="h-20 mx-auto mb-4"
            data-testid="login-logo"
            loading="eager"
          />
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Bienvenido</h1>
          <p className="text-sm text-gray-500 mt-1">Ingrese sus credenciales para continuar</p>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="userCode" className="text-[#1A1A1A] font-medium">
                Código de Usuario
              </Label>
              <input
                id="userCode"
                type="text"
                placeholder="Ingrese su código"
                value={userCode}
                onChange={handleUserCodeChange}
                autoComplete="username"
                className="flex h-12 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#D4A5A5] focus:ring-2 focus:ring-[#D4A5A5]/20 transition-colors"
                data-testid="login-user-code-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A1A1A] font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  className="flex h-12 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 pr-12 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#D4A5A5] focus:ring-2 focus:ring-[#D4A5A5]/20 transition-colors"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium mt-6"
              data-testid="login-submit-button"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#1A1A1A] border-t-transparent" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} />
                  Ingresar
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
