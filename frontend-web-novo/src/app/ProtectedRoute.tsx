import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-brand-deep text-brand-vibrant flex items-center justify-center mx-auto shadow-lg shadow-brand-deep/30">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Acesso Restrito ao Portal
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Esta rota exige uma sessão ativa autenticada via Keycloak SSO corporativo.
            </p>
          </div>

          <div className="pt-2">
            <Navigate to="/" state={{ from: location }} replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
