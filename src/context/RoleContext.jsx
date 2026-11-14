import { useAuth } from './AuthContext';

// The role now comes from the signed-in user. Pages that only need the role keep using this.
export const useRole = () => ({ role: useAuth().user?.role ?? null });
