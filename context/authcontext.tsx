import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext<{
  session: Session | null;
  setSession: (session: Session | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string
  ) => Promise<{ error: any; session: Session | null }>;
  logout: () => Promise<void>;
  isUser: boolean;
}>({
  session: null,
  setSession: () => {},
  login: async () => {},
  signup: async () => ({ error: null, session: null }),
  logout: async () => {},
  isUser: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setSession(data.session);
  };

  const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    setSession(data.session);
    return { error, session: data.session };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.replace("/");
  };

  const isUser = !!session?.user;

  return (
    <AuthContext.Provider
      value={{ session, setSession, login, signup, logout, isUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
