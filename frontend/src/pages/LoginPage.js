import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.85)), url('https://images.unsplash.com/photo-1627811015433-368c148f6c3c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwY29zbWV0aWNzfGVufDB8fHx8MTc3MjA2MDgzOXww&ixlib=rb-4.1.0&q=85')`
      }}
    >
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2 pt-8">
          <img 
            src={LOGO_URL} 
            alt="Manrique Importadora" 
            className="h-20 mx-auto mb-4"
            data-testid="login-logo"
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
              <Input
                id="userCode"
                type="text"
                placeholder="Ingrese su código"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                className="h-12 bg-gray-50/50 border-gray-200 focus:border-[#D4A5A5] focus:ring-[#D4A5A5]/20"
                data-testid="login-user-code-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A1A1A] font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-gray-50/50 border-gray-200 focus:border-[#D4A5A5] focus:ring-[#D4A5A5]/20 pr-12"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium transition-all active:scale-[0.98] mt-6"
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
