import { createContext, useContext, useState } from 'react';
const RoleContext = createContext(null);

// Design-testing only. Replace with real auth (JWT from the Python API) later.
export function RoleProvider({ children }) {
  const [role, setRole] = useState('director');
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}
export const useRole = () => useContext(RoleContext);
