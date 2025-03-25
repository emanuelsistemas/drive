import React, { useState, useEffect } from 'react';
import { HardDriveDownload, Eye, EyeOff } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar se o usuário já está autenticado
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSwitchToRegister = () => {
    setShowAdminPrompt(true);
  };

  const handleAdminPasswordSuccess = () => {
    setIsLogin(false);
    setShowAdminPrompt(false);
    toast.success('Senha administrativa correta!', {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: 'dark',
      transition: toast.Slide,
    });
  };

  const handleBackToLogin = () => {
    setIsLogin(true);
    setShowAdminPrompt(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <HardDriveDownload className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 logo-text">nexo drive</h1>
        </div>

        {showAdminPrompt ? (
          <AdminPasswordPrompt
            onSuccess={handleAdminPasswordSuccess}
            onBack={handleBackToLogin}
          />
        ) : isLogin ? (
          <LoginForm 
            onSwitchToRegister={handleSwitchToRegister}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <RegisterForm onSwitchToLogin={handleBackToLogin} />
        )}
      </div>
    </div>
  );
}

interface AdminPasswordPromptProps {
  onSuccess: () => void;
  onBack: () => void;
}

const AdminPasswordPrompt: React.FC<AdminPasswordPromptProps> = ({ onSuccess, onBack }) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === import.meta.env.VITE_ADMIN_PASSWORD) {
      onSuccess();
    } else {
      toast.error('Senha administrativa incorreta!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
        transition: toast.Slide,
      });
    }
  };

  return (
    <div className="bg-gray-800 p-8 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Senha Administrativa</h2>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="adminPassword" className="block text-gray-300 mb-2">
              Digite a senha administrativa
            </label>
            <div className="relative">
              <input
                id="adminPassword"
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="auth-input pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" className="auth-button">
            Confirmar
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );
};

export default App;