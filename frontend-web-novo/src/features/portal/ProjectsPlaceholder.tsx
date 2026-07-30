import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, Clock, Users } from 'lucide-react';

export const ProjectsPlaceholder: React.FC = () => {
  const { activeOrganization, activeRole } = useAuthStore();

  const MOCK_PROJECTS = [
    { id: 'p1', name: 'Projeto Governança Digital 2026', code: 'GOV-26', status: 'Em Andamento', hours: '320h', members: 6 },
    { id: 'p2', name: 'Sistema de Gestão de Apontamentos', code: 'SGA-01', status: 'Planejamento', hours: '180h', members: 4 },
    { id: 'p3', name: 'Integração Keycloak SSO', code: 'IK-99', status: 'Concluído', hours: '95h', members: 3 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Projetos da {activeOrganization?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualizando projetos autorizados para a faceta <strong className="text-slate-700 dark:text-slate-300">{activeRole?.name}</strong>.
          </p>
        </div>

        <button className="px-4 py-2 rounded-xl bg-brand-medium hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-brand-medium/20 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_PROJECTS.map((proj) => (
          <div key={proj.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-brand-medium/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono text-brand-deep dark:text-brand-medium">
                {proj.code}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                {proj.status}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2">{proj.name}</h3>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-medium" />
                {proj.hours}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {proj.members} membros
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
