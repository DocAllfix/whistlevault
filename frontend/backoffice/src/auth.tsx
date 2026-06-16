import { createContext, ReactNode, useContext, useState } from "react";

interface AuthState {
  token: string | null;
  role: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        login: (t, r) => {
          setToken(t);
          setRole(r);
        },
        logout: () => {
          setToken(null);
          setRole(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
