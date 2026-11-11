import { createContext, useContext, useState } from 'react';
import useApi from './useApi';

export const GlobalContext = createContext();

export function GlobalProvider({ children }) {
  const { authorization, setAuthorization } = useApi();
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState(null);

  return <GlobalContext.Provider
    value={{
      authorization, setAuthorization,
      username, setUsername,
      role, setRole,
    }}
  >
    {children}
  </GlobalContext.Provider>;
}

export default function useGlobal() {
  return useContext(GlobalContext);
}