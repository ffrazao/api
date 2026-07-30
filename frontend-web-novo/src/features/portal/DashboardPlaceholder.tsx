import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { Building2, UserCheck, Clock, CheckCircle2, TrendingUp, AlertCircle, RefreshCw, Send } from 'lucide-react';

export const DashboardPlaceholder: React.FC = () => {
  const { activeOrganization, activeRole } = useAuthStore();
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const testApiConnection = async () => {
    setIsTestingApi(true);
    setApiStatus(null);
    try {
      // Direct call to Axios service pointing to http://localhost:8081/api/v1/usuarios/me/contexto
      const response = await api.get('/v1/usuarios/me/contexto');
      setApiStatus(`Sucesso (${response.status}): Contexto obtido via GET /v1/usuarios/me/contexto! Headers X-Current-Tenant e X-Current-Role injetados com sucesso.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
      setApiStatus(`API em http://localhost:8081/api (Interceptadores ativos: X-Current-Tenant="${activeOrganization?.id}", X-Current-Role="${activeRole?.code}"). Status: ${errorMsg}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Active Context Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-deep via-blue-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-vibrant/20 border border-brand-vibrant/40 text-brand-vibrant text-xs font-bold uppercase tracking-wider">
              Sessão Ativa
            </span>
            <span className="text-xs text-slate-300">Faceta Única de Atuação</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Painel da {activeOrganization?.name}
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Você está operando como <strong className="text-white">{activeRole?.name}</strong> sob a organização <strong className="text-white">{activeOrganization?.code}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-300">Papel em Exercício</div>
            <div className="text-sm font-bold text-white">{activeRole?.name}</div>
          </div>
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: activeRole?.badgeColor || '#1E3A8A' }}
          >
            {activeRole?.code}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Projetos Ativos</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-slate-800 text-brand-medium">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">8</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-vibrant" />
            <span>2 iniciados este mês</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Horas Apontadas</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-slate-800 text-brand-vibrant">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">142h 30m</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-vibrant" />
            <span>95% aprovadas</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Papel Atual</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-slate-800 text-purple-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {activeRole?.code}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">{activeRole?.name}</div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Pendências de Aprovação</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">3</div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Aguardando sua validação</div>
        </div>
      </div>

      {/* Backend Integration Inspector */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-brand-medium" />
            Comunicação Backend & Interceptadores Axios (`src/services/api.ts`)
          </h3>

          <button
            onClick={testApiConnection}
            disabled={isTestingApi}
            className="px-3 py-1.5 rounded-lg bg-brand-deep hover:bg-blue-900 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
            Testar Conexão HTTP
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2 font-mono">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">Base URL:</span>
            <span className="font-bold text-brand-medium">http://localhost:8081/api</span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">Endpoint de Teste:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">GET /v1/usuarios/me/contexto</span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">X-Current-Tenant Header:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{activeOrganization?.id} ({activeOrganization?.code})</span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">X-Current-Role Header:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{activeRole?.code}</span>
          </div>
        </div>

        {apiStatus && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-medium border border-blue-200 dark:border-blue-900">
            {apiStatus}
          </div>
        )}
      </div>
    </div>
  );
};
