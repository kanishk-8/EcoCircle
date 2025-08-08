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
    password: string,
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
    try {
      console.log("Attempting login for email:", email);
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      console.log("Login successful for user:", data.user?.id);
      setSession(data.session);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      console.log("Attempting signup for email:", email);
      console.log("Supabase URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log("Current session before signup:", session?.user?.id);

      // Check if user already exists
      const { data: existingUser } = await supabase.auth.getUser();
      if (existingUser.user) {
        console.log("User already logged in, signing out first");
        await supabase.auth.signOut();
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            email: email.trim().toLowerCase(),
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          code: error.code || "no_code",
          name: error.name,
        });

        // Check for specific database errors
        if (error.message?.includes("Database error")) {
          console.error(
            "Database error detected - check Supabase triggers and RLS policies",
          );
        }

        return { error, session: null };
      }

      console.log("Signup response data:", {
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              email_confirmed_at: data.user.email_confirmed_at,
              created_at: data.user.created_at,
            }
          : null,
        session: data.session
          ? {
              access_token: !!data.session.access_token,
              refresh_token: !!data.session.refresh_token,
              expires_at: data.session.expires_at,
            }
          : null,
      });

      // Only set session if it exists
      if (data.session) {
        setSession(data.session);
      }

      return { error: null, session: data.session };
    } catch (unexpectedError: any) {
      console.error("Unexpected signup error:", unexpectedError);
      console.error("Error stack:", unexpectedError.stack);

      return {
        error: {
          message:
            unexpectedError.message ||
            "An unexpected error occurred during signup",
          originalError: unexpectedError,
        },
        session: null,
      };
    }
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
