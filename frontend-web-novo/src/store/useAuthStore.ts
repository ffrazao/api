import { create } from 'zustand';
import type { AuthState, Organization, Role, UserProfile } from '../types';

const INITIAL_ORGS: Organization[] = [
  {
    id: 'b567a123-8899-4c12-b001-998877665544',
    name: 'Secretaria de Inovação & Tecnologia',
    slug: 'sec-inovacao',
    code: 'SIT',
    domain: 'inovacao.gov.br',
  },
  {
    id: 'c678b234-9900-5d23-c112-887766554433',
    name: 'Laboratório Central de Pesquisa',
    slug: 'lab-pesquisa',
    code: 'LCP',
    domain: 'pesquisa.org',
  },
  {
    id: 'd789c345-0011-6e34-d223-776655443322',
    name: 'Instituto de Gestão de Projetos',
    slug: 'inst-gestao',
    code: 'IGP',
    domain: 'igp.org.br',
  },
];

const INITIAL_ROLES: Role[] = [
  {
    id: 'role-01',
    name: 'Gestor de Projetos',
    code: 'GESTORE',
    badgeColor: '#1E3A8A',
    description: 'Gestão completa de cronogramas, alocações e equipes.',
  },
  {
    id: 'role-02',
    name: 'Colaborador Técnico',
    code: 'COLABORADOR',
    badgeColor: '#3B82F6',
    description: 'Apontamento de horas, tarefas e entregas individuais.',
  },
  {
    id: 'role-03',
    name: 'Auditor de Governança',
    code: 'AUDITOR',
    badgeColor: '#10B981',
    description: 'Visualização de relatórios de aderência e compliance.',
  },
  {
    id: 'role-04',
    name: 'Administrador da Plataforma',
    code: 'ADMIN',
    badgeColor: '#6366F1',
    description: 'Configurações de infraestrutura e gestão de acessos.',
  },
];

const MOCK_USER: UserProfile = {
  id: 'usr-8842',
  keycloakSub: 'f3a9e1d8-4422-491a-b333-881122334455',
  name: 'Carlos Frazão',
  email: 'carlos.frazao@tempo.gov.br',
  initials: 'CF',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: MOCK_USER,
  token: typeof window !== 'undefined' ? localStorage.getItem('tp_auth_token') : null,
  refreshToken: null,
  idToken: typeof window !== 'undefined' ? localStorage.getItem('tp_id_token') : null,
  isAuthenticated: true,

  availableOrganizations: INITIAL_ORGS,
  availableRoles: INITIAL_ROLES,
  activeOrganization: INITIAL_ORGS[0],
  activeRole: INITIAL_ROLES[0],

  setActiveOrganization: (org: Organization) => set({ activeOrganization: org }),
  setActiveRole: (role: Role) => set({ activeRole: role }),
  setAvailableOrganizations: (orgs: Organization[]) => set({ availableOrganizations: orgs }),
  setAvailableRoles: (roles: Role[]) => set({ availableRoles: roles }),

  setAuth: (token: string, user: UserProfile, refreshToken?: string, idToken?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tp_auth_token', token);
      if (idToken) {
        localStorage.setItem('tp_id_token', idToken);
      }
    }
    set({
      token,
      user,
      refreshToken: refreshToken || null,
      idToken: idToken || (typeof window !== 'undefined' ? localStorage.getItem('tp_id_token') : null),
      isAuthenticated: true,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tp_auth_token');
      localStorage.removeItem('tp_id_token');
    }
    set({
      token: null,
      refreshToken: null,
      idToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));