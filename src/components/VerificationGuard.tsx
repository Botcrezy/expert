import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIdentityVerificationStatus, useVerificationSettings } from "@/hooks/useVerificationSettings";
import { Loader2 } from "lucide-react";

interface VerificationGuardProps {
  children: React.ReactNode;
  userType: "client" | "freelancer";
}

export function VerificationGuard({ children, userType }: VerificationGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useVerificationSettings();
  const { data: verificationStatus, isLoading: verificationLoading } = useIdentityVerificationStatus(user?.id, userType);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const isRequired = userType === "client" 
    ? settings?.client_identity_required 
    : settings?.freelancer_identity_required;

  useEffect(() => {
    if (authLoading || settingsLoading || verificationLoading) return;
    
    // If verification is required and user is not verified
    if (isRequired && !verificationStatus?.verified) {
      // Allow access to verification page itself and support pages
      const currentPath = window.location.pathname;
      const verifyPath = userType === "client" ? "/client/identity-verification" : "/freelancer/identity-verification";
      
      // Allow access to verification pages and support pages
      const allowedPaths = ["verify", "support"];
      const isAllowedPath = allowedPaths.some(path => currentPath.includes(path));
      
      if (!isAllowedPath) {
        navigate(verifyPath, { replace: true });
        return;
      }
    }
    
    setChecked(true);
  }, [authLoading, settingsLoading, verificationLoading, isRequired, verificationStatus, userType, navigate]);

  if (authLoading || settingsLoading || verificationLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
