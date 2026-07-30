import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, LayoutDashboard, FolderKanban, Clock, Users, Settings, ShieldCheck } from 'lucide-react';

const ROUTE_NAME_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  app: { label: 'Portal', icon: Home },
  dashboard: { label: 'Visão Geral', icon: LayoutDashboard },
  projetos: { label: 'Projetos', icon: FolderKanban },
  horas: { label: 'Gestão de Tempo', icon: Clock },
  equipes: { label: 'Equipes', icon: Users },
  governanca: { label: 'Governança', icon: ShieldCheck },
  configuracoes: { label: 'Configurações', icon: Settings },
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Home className="w-3.5 h-3.5 text-brand-medium" />
        <span>Página Inicial</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
      <Link
        to="/"
        className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-brand-medium transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Início</span>
      </Link>

      {pathSegments.map((segment, index) => {
        const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
        const isLast = index === pathSegments.length - 1;
        const config = ROUTE_NAME_MAP[segment] || {
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          icon: null,
        };
        const IconComponent = config.icon;

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            {isLast ? (
              <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {IconComponent && <IconComponent className="w-3 h-3 text-brand-medium" />}
                {config.label}
              </span>
            ) : (
              <Link
                to={url}
                className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-brand-medium transition-colors"
              >
                {IconComponent && <IconComponent className="w-3 h-3" />}
                {config.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
