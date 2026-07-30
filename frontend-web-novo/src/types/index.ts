export interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string;
  logoUrl?: string;
  domain?: string;
}

export interface Role {
  id: string;
  name: string;
  code: 'GESTORE' | 'COLABORADOR' | 'AUDITOR' | 'ADMIN';
  badgeColor: string;
  description: string;
}

export interface UserProfile {
  id: string;
  keycloakSub?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  
  // Contexto Ativo (Faceta Única)
  activeOrganization: Organization | null;
  activeRole: Role | null;
  availableOrganizations: Organization[];
  availableRoles: Role[];

  // Actions
  setActiveOrganization: (org: Organization) => void;
  setActiveRole: (role: Role) => void;
  setAvailableOrganizations: (orgs: Organization[]) => void;
  setAvailableRoles: (roles: Role[]) => void;
  setAuth: (token: string, user: UserProfile, refreshToken?: string, idToken?: string) => void;
  logout: () => void;
}

export interface ActiveContextState {
  activeOrg: Organization | null;
  activeRole: Role | null;
  availableOrgs: Organization[];
  availableRoles: Role[];
  setActiveOrg: (org: Organization) => void;
  setActiveRole: (role: Role) => void;
  setAvailableOrgs: (orgs: Organization[]) => void;
  setAvailableRoles: (roles: Role[]) => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}
