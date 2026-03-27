import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Loader2 } from "lucide-react";

interface FreelancerLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function FreelancerLayout({ children, title, subtitle, actions }: FreelancerLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check freelancer verification status
  const { data: freelancerProfile, isLoading } = useQuery({
    queryKey: ["freelancer-verification", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("is_verified, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    // If not verified, redirect to pending page
    if (!isLoading && freelancerProfile) {
      if (!freelancerProfile.is_verified || freelancerProfile.verification_status !== "approved") {
        navigate("/freelancer/account-pending", { replace: true });
      }
    }
  }, [freelancerProfile, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not verified
  if (!freelancerProfile?.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </DashboardLayout>
  );
}
