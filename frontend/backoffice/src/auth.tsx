import { createContext, ReactNode, useContext, useState } from "react";

interface AuthState {
  token: string | null;
  role: string | null;
  pwdChangeNeeded: boolean;
  twoFaSetupNeeded: boolean;
  login: (
    token: string,
    role: string,
    pwdChangeNeeded?: boolean,
    twoFaSetupNeeded?: boolean,
  ) => void;
  clearPwdChange: () => void;
  clearTwoFa: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [pwdChangeNeeded, setPwdChangeNeeded] = useState(false);
  const [twoFaSetupNeeded, setTwoFaSetupNeeded] = useState(false);
  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        pwdChangeNeeded,
        twoFaSetupNeeded,
        login: (t, r, needed = false, twoFa = false) => {
          setToken(t);
          setRole(r);
          setPwdChangeNeeded(needed);
          setTwoFaSetupNeeded(twoFa);
        },
        clearPwdChange: () => setPwdChangeNeeded(false),
        clearTwoFa: () => setTwoFaSetupNeeded(false),
        logout: () => {
          setToken(null);
          setRole(null);
          setPwdChangeNeeded(false);
          setTwoFaSetupNeeded(false);
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
