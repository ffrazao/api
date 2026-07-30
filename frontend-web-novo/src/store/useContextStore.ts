import { useAuthStore } from './useAuthStore';
import type { ActiveContextState } from '../types';

/**
 * Legacy useContextStore adapter wrapping useAuthStore for backward compatibility.
 */
export const useContextStore = (): ActiveContextState => {
  const store = useAuthStore();

  return {
    activeOrg: store.activeOrganization,
    activeRole: store.activeRole,
    availableOrgs: store.availableOrganizations,
    availableRoles: store.availableRoles,
    setActiveOrg: store.setActiveOrganization,
    setActiveRole: store.setActiveRole,
    setAvailableOrgs: store.setAvailableOrganizations,
    setAvailableRoles: store.setAvailableRoles,
  };
};
