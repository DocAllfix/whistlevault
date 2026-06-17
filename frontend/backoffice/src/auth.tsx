import { createContext, ReactNode, useContext, useState } from "react";

interface AuthState {
  token: string | null;
  role: string | null;
  pwdChangeNeeded: boolean;
  login: (token: string, role: string, pwdChangeNeeded?: boolean) => void;
  clearPwdChange: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [pwdChangeNeeded, setPwdChangeNeeded] = useState(false);
  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        pwdChangeNeeded,
        login: (t, r, needed = false) => {
          setToken(t);
          setRole(r);
          setPwdChangeNeeded(needed);
        },
        clearPwdChange: () => setPwdChangeNeeded(false),
        logout: () => {
          setToken(null);
          setRole(null);
          setPwdChangeNeeded(false);
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
