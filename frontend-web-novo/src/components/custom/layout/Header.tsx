import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Building2,
  UserCheck,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useThemeStore } from '../../../store/useThemeStore';
import { useSidebarStore } from '../../../store/useSidebarStore';
import { Breadcrumb } from './Breadcrumb';
import { NotificationCenter } from './NotificationCenter';
import { UserProfileMenu } from './UserProfileMenu';
import type { Organization, Role } from '../../../types';

export const Header: React.FC = () => {
  const { toggleSidebar, isCollapsed } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    activeOrganization,
    activeRole,
    availableOrganizations,
    availableRoles,
    setActiveOrganization,
    setActiveRole,
  } = useAuthStore();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between transition-colors">
      {/* Left Section: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-medium/50"
          title={isCollapsed ? 'Expandir Sidebar' : 'Recolher Sidebar'}
          aria-label="Alternar menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Right Section: Permanent Active Context Selectors & Global Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Permanent Selector 1: Organização Ativa */}
        <div className="relative" ref={orgDropdownRef}>
          <button
            onClick={() => {
              setIsOrgDropdownOpen(!isOrgDropdownOpen);
              setIsRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand-medium/50"
            title="Seletor Permanente de Organização Ativa"
          >
            <Building2 className="w-4 h-4 text-brand-deep dark:text-brand-medium flex-shrink-0" />
            <div className="hidden lg:flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                Organização Ativa
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                {activeOrganization ? activeOrganization.name : 'Selecione Org'}
              </span>
            </div>
            <span className="lg:hidden text-xs font-bold text-slate-800 dark:text-slate-100">
              {activeOrganization?.code}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {isOrgDropdownOpen && (
            <div className="absolute right-0 lg:left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Trocar Faceta de Organização
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {availableOrganizations.map((org: Organization) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setActiveOrganization(org);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      activeOrganization?.id === org.id
                        ? 'bg-brand-medium/10 dark:bg-brand-medium/20 text-brand-deep dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {org.code}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </div>
                    {activeOrganization?.id === org.id && <Check className="w-4 h-4 text-brand-medium" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Permanent Selector 2: Papel Ativo */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => {
              setIsRoleDropdownOpen(!isRoleDropdownOpen);
              setIsOrgDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand-medium/50"
            title="Seletor Permanente de Papel Ativo"
          >
            <UserCheck className="w-4 h-4 text-brand-medium flex-shrink-0" />
            <div className="hidden lg:flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                Papel Ativo
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                {activeRole ? activeRole.name : 'Selecione Papel'}
              </span>
            </div>
            {activeRole && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: activeRole.badgeColor || '#1E3A8A' }}
              >
                {activeRole.code}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Trocar Faceta de Papel Ativo
                </p>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {availableRoles.map((role: Role) => (
                  <button
                    key={role.id}
                    onClick={() => {
                      setActiveRole(role);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-xs flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      activeRole?.id === role.id
                        ? 'bg-brand-medium/10 dark:bg-brand-medium/20 text-brand-deep dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold">{role.name}</span>
                        <span
                          className="px-1.5 py-0.2 text-[9px] rounded text-white font-bold"
                          style={{ backgroundColor: role.badgeColor }}
                        >
                          {role.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {role.description}
                      </p>
                    </div>
                    {activeRole?.id === role.id && <Check className="w-4 h-4 text-brand-medium mt-1" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-medium/50"
          title={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
          aria-label="Alternar tema visual"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-slate-700" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
        </button>

        {/* Notification Center with #10B981 badge */}
        <NotificationCenter />

        {/* User Profile Dropdown */}
        <UserProfileMenu />
      </div>
    </header>
  );
};
