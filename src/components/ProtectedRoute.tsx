import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIdentityVerificationStatus, useVerificationSettings } from "@/hooks/useVerificationSettings";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  const isFreelancerAllowed = allowedRoles?.includes("freelancer");

  // Check freelancer verification status (also when user is marked as client but has freelancer profile)
  const { data: freelancerProfile, isLoading: freelancerLoading } = useQuery({
    queryKey: ["freelancer-verification", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("is_verified, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && (userRole === "freelancer" || isFreelancerAllowed),
  });

  // Derive an effective role: if user has a freelancer profile, always treat as freelancer
  const effectiveRole =
    userRole === "client" && freelancerProfile
      ? "freelancer"
      : userRole;

  // Get verification settings
  const { data: verificationSettings, isLoading: settingsLoading } = useVerificationSettings();
  
  // Get identity verification status
  const userType = effectiveRole === "freelancer" ? "freelancer" : "client";
  const { data: identityStatus, isLoading: identityLoading } = useIdentityVerificationStatus(
    user?.id, 
    userType
  );

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_70%)]" />
          <div className="absolute -bottom-40 right-0 w-72 h-72 rounded-3xl bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-6">
          <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl animate-scale-in">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-5" />
            <p className="text-xs uppercase tracking-[0.22em] text-primary/70 mb-2">
              Sity Experts
            </p>
            <p className="text-lg font-semibold bg-gradient-to-l from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-shift mb-2">
              جاري التحقق من حسابك
            </p>
            <p className="text-sm text-muted-foreground">
              جاري التحميل...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to the correct login page if not authenticated
  if (!user) {
    const loginPath =
      allowedRoles?.includes("admin") || allowedRoles?.includes("team_leader")
        ? "/admin/login"
        : allowedRoles?.includes("freelancer")
          ? "/freelancer/login"
          : allowedRoles?.includes("client")
            ? "/client/login"
            : "/login";

    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Wait for role to be fetched if user exists but role is not yet loaded
  if (user && effectiveRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  // Check role-based access if allowedRoles is specified
  // NOTE: This is for UX navigation only. Real authorization is enforced server-side
  // by database access rules and backend functions.
  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    // Redirect based on user role
    const roleRedirects: Record<string, string> = {
      client: "/client/dashboard",
      freelancer: "/freelancer/account-pending",
      admin: "/admin",
      team_leader: "/admin",
    };

    const redirectPath = roleRedirects[effectiveRole] || "/";
    return <Navigate to={redirectPath} replace />;
  }

  // For freelancer routes, check if the freelancer is verified
  if (effectiveRole === "freelancer" && allowedRoles?.includes("freelancer")) {
    // Skip verification check for account-pending page and identity verification page
    if (location.pathname === "/freelancer/account-pending" || 
        location.pathname === "/freelancer/identity-verification" ||
        location.pathname === "/freelancer/verify") {
      return <>{children}</>;
    }

    // Wait for freelancer profile to load
    if (freelancerLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">جاري التحقق من حالة حسابك...</p>
          </div>
        </div>
      );
    }

    // Redirect unverified freelancers to pending page
    if (freelancerProfile && !freelancerProfile.is_verified) {
      return <Navigate to="/freelancer/account-pending" replace />;
    }
  }

  // Check mandatory identity verification for clients and freelancers
  if (effectiveRole && ["client", "freelancer"].includes(effectiveRole)) {
    // Skip check for identity verification pages and support pages
    const isVerificationPage = 
      location.pathname.includes("identity-verification") ||
      location.pathname.includes("/verify") ||
      location.pathname.includes("/support"); // Allow all support pages including subpages
    
    if (!isVerificationPage) {
      // Wait for settings and identity status to load
      if (settingsLoading || identityLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">جاري التحقق من البيانات...</p>
            </div>
          </div>
        );
      }

      // Check if identity verification is required and not completed
      const isRequired = effectiveRole === "client" 
        ? verificationSettings?.client_identity_required 
        : verificationSettings?.freelancer_identity_required;

      if (isRequired && identityStatus && !identityStatus.verified) {
        const verifyPath = effectiveRole === "client" 
          ? "/client/identity-verification" 
          : "/freelancer/identity-verification";
        return <Navigate to={verifyPath} replace />;
      }
    }
  }

  return <>{children}</>;
}
