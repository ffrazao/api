import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Clock,
  Users,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebarStore } from '../../../store/useSidebarStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { Logo } from './Logo';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/app/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/app/projetos', label: 'Projetos', icon: FolderKanban, badge: '12' },
  { path: '/app/horas', label: 'Gestão de Tempo', icon: Clock },
  { path: '/app/equipes', label: 'Equipes', icon: Users },
  { path: '/app/governanca', label: 'Governança', icon: ShieldCheck },
  { path: '/app/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { activeOrganization, activeRole } = useAuthStore();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col border-r border-slate-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/60">
        <Link to="/" className="flex items-center gap-3 group focus:outline-none overflow-hidden">
          <Logo size={32} variant={isCollapsed ? 'symbol' : 'horizontal'} themeMode="dark" />
        </Link>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Org Banner (Expanded state) */}
      {!isCollapsed && activeOrganization && (
        <div className="mx-3 my-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-deep text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
            {activeOrganization.code}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
              Organização Ativa
            </span>
            <p className="text-xs font-semibold text-slate-200 truncate">{activeOrganization.name}</p>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-brand-medium text-white shadow-md shadow-brand-medium/25 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}

                  {!isCollapsed && item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-brand-vibrant border border-brand-vibrant/30">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-950 text-white text-xs font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-800">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info / Facet Summary */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeRole?.badgeColor || '#10B981' }}
              />
              <span className="truncate max-w-[120px] font-medium text-slate-300">
                {activeRole?.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeRole?.badgeColor || '#10B981' }}
              title={`Papel: ${activeRole?.name}`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
