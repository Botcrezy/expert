import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const maskEmail = (email: string) => {
  const trimmed = (email || "").trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local.slice(0, 1) || "*";
  return `${first}***@${domain}`;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  userRole: string | null;
  roleLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchUserRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch explicit roles + detect freelancer profile as a fallback
      const [rolesResult, freelancerResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("freelancer_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const { data: rolesData, error: rolesError } = rolesResult as any;
      const { data: freelancerProfile, error: freelancerError } = freelancerResult as any;

      let resolvedRole: string | null = null;

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
      } else if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map((r: any) => r.role);
        // Priority: admin > team_leader > freelancer > client
        const priority = ["admin", "team_leader", "freelancer", "client"];
        const found = priority.find((role) => roles.includes(role));
        resolvedRole = found || roles[0] || null;
      }

      // If no explicit freelancer role but freelancer profile exists, treat user as freelancer
      if ((!resolvedRole || resolvedRole === "client") && !freelancerError && freelancerProfile) {
        resolvedRole = "freelancer";
      }

      setUserRole(resolvedRole || "client");
    } catch (err) {
      console.error("Error fetching user role:", err);
      setUserRole("client");
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role after auth state change
        if (session?.user) {
          // Use setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: string = "client") => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          signup_role: role, // Important: this triggers the correct role assignment in handle_new_user
        },
      },
    });
    
    // If signup successful, log event (role assignment is handled by handle_new_user trigger)
    if (!error && data?.user) {
      // Log signup + implicit login into system and security logs
      try {
        await (supabase as any).from("system_logs").insert({
          user_id: data.user.id,
          action_type: "login",
          entity_type: "auth",
          details: { method: "password", source: "signup", role },
        });

        await (supabase as any).from("security_logs").insert({
          user_id: data.user.id,
          event_type: "login_success",
          severity: "info",
          description: "Successful signup and automatic login",
        });
      } catch (e) {
        console.error("Failed to write signup logs", e);
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Log failed login attempt (avoid storing raw email in logs)
      try {
        await (supabase as any).from("security_logs").insert({
          user_id: null,
          event_type: "login_failed",
          severity: "warning",
          description: `فشل تسجيل الدخول للبريد ${maskEmail(email)}`,
        });
      } catch (e) {
        console.error("Failed to write failed login log", e);
      }

      return { error: error as Error | null };
    }

    // Successful login
    try {
      const userId = data.user?.id;
      if (userId) {
        await (supabase as any).from("system_logs").insert({
          user_id: userId,
          action_type: "login",
          entity_type: "auth",
          details: { method: "password", source: "login", email_masked: maskEmail(email) },
        });

        await (supabase as any).from("security_logs").insert({
          user_id: userId,
          event_type: "login_success",
          severity: "info",
          description: "Successful login",
        });
      }
    } catch (e) {
      console.error("Failed to write login logs", e);
    }
    
    return { error: null };
  };

  const signOut = async () => {
    const currentUser = user;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);

    // Log logout event
    try {
      if (currentUser) {
        await (supabase as any).from("system_logs").insert({
          user_id: currentUser.id,
          action_type: "logout",
          entity_type: "auth",
          details: { source: "logout" },
        });
      }
    } catch (e) {
      console.error("Failed to write logout log", e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      userRole,
      roleLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
