import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ExternalLink, ShieldAlert, Activity, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { authService } from '../../../services/authService';
import { api } from '../../../services/api';

interface ContextTestResult {
  show: boolean;
  loading: boolean;
  status?: number;
  headersSent?: {
    authorization: string;
    tenant: string;
    role: string;
  };
  data?: unknown;
  error?: string;
}

export const UserProfileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, activeOrganization, activeRole, token } = useAuthStore();

  const [testResult, setTestResult] = useState<ContextTestResult>({
    show: false,
    loading: false,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTestUserContext = async () => {
    setIsOpen(false);
    setTestResult({
      show: true,
      loading: true,
      headersSent: {
        authorization: token ? `Bearer ${token.substring(0, 15)}...` : 'Ausente',
        tenant: activeOrganization?.id || activeOrganization?.code || 'N/A',
        role: activeRole?.code || 'N/A',
      },
    });

    try {
      // Direct call using Axios api instance (http://localhost:8081/api/v1/usuarios/me/contexto)
      const response = await api.get('/v1/usuarios/me/contexto');
      setTestResult((prev) => ({
        ...prev,
        loading: false,
        status: response.status,
        data: response.data,
      }));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na requisição';
      setTestResult((prev) => ({
        ...prev,
        loading: false,
        error: `Rota /v1/usuarios/me/contexto (8081): ${errorMsg}`,
      }));
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-medium/50 cursor-pointer"
          title="Perfil do Usuário"
        >
          <div className="w-8 h-8 rounded-full bg-brand-deep text-white font-medium text-xs flex items-center justify-center shadow-sm border border-brand-medium/30">
            {user?.initials || 'U'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name || 'Usuário'}
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {activeRole?.name || 'Sem Papel'}
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-deep text-white font-bold text-sm flex items-center justify-center">
                  {user?.initials || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Facet Summary Badge */}
              <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                  Faceta Ativa no Sistema
                </span>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-semibold truncate max-w-[140px]">{activeOrganization?.name}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: activeRole?.badgeColor || '#1E3A8A' }}
                  >
                    {activeRole?.code}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                Meu Perfil
              </button>

              {/* Required Button 2: Testar Contexto do Usuário */}
              <button
                onClick={handleTestUserContext}
                className="w-full px-4 py-2 text-xs text-left text-brand-medium hover:bg-brand-medium/10 dark:hover:bg-brand-medium/20 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                title="Testar rota protegida GET http://localhost:8081/api/v1/usuarios/me/contexto"
              >
                <Activity className="w-4 h-4 text-brand-medium" />
                Testar Contexto do Usuário
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Preferências da Conta
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
              <div className="px-4 py-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <ShieldAlert className="w-3 h-3 text-brand-medium" />
                <span>Autenticado via Keycloak SSO</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  authService.logout();
                }}
                className="w-full px-4 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta (SSO)
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal / Card flutuante do Teste de Contexto do Usuário */}
      {testResult.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-medium/10 text-brand-medium">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Teste do Contexto do Usuário
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    GET http://localhost:8081/api/v1/usuarios/me/contexto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestResult({ show: false, loading: false })}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {testResult.loading ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-brand-medium animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Disparando requisição com interceptadores Axios...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Headers Sent Summary */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Headers Corporativos Injetados pelo Interceptador
                  </span>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">Authorization:</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                      {testResult.headersSent?.authorization}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">X-Current-Tenant:</span>
                    <span className="text-brand-medium font-bold">{testResult.headersSent?.tenant}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-500">X-Current-Role:</span>
                    <span className="text-emerald-500 font-bold">{testResult.headersSent?.role}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resultado do Backend:</span>
                  {testResult.status ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      HTTP {testResult.status} OK
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Erro de Resposta
                    </span>
                  )}
                </div>

                {/* Response Payload Console */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Payload de Resposta (JSON):
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono max-h-48 overflow-y-auto border border-slate-800">
                    {testResult.data
                      ? JSON.stringify(testResult.data, null, 2)
                      : testResult.error || 'Nenhum payload retornado.'}
                  </pre>
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setTestResult({ show: false, loading: false })}
                className="px-4 py-2 rounded-xl bg-brand-deep hover:bg-blue-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
