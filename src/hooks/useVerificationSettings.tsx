import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerificationSettings {
  enabled: boolean;
  client_identity_required: boolean;
  freelancer_identity_required: boolean;
}

export function useVerificationSettings() {
  return useQuery({
    queryKey: ["verification-settings"],
    queryFn: async (): Promise<VerificationSettings> => {
      // Fetch from settings table
      const { data: settings } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", [
          "identity_verification_enabled",
          "client_identity_required",
          "freelancer_identity_required",
        ]);

      const settingsMap = (settings || []).reduce((acc, s) => {
        let val = s.value;
        // Handle double-encoded JSON
        if (typeof val === "string") {
          try {
            val = JSON.parse(val);
          } catch {}
        }
        acc[s.key] = val === true || val === "true";
        return acc;
      }, {} as Record<string, boolean>);

      const enabled = settingsMap.identity_verification_enabled ?? false;

      return {
        enabled,
        client_identity_required:
          enabled && (settingsMap.client_identity_required ?? false),
        freelancer_identity_required:
          enabled && (settingsMap.freelancer_identity_required ?? false),
      };
    },
    staleTime: 60000,
  });
}

export function useIdentityVerificationStatus(userId?: string, userType?: "client" | "freelancer") {
  const { data: settings } = useVerificationSettings();

  return useQuery({
    queryKey: ["identity-status", userId, userType],
    queryFn: async () => {
      if (!userId) return { verified: false, pending: false, required: false };

      const { data } = await supabase
        .from("identity_verifications")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isRequiredBase = userType === "client"
        ? settings?.client_identity_required
        : settings?.freelancer_identity_required;

      const required = !!settings?.enabled && !!isRequiredBase;

      return {
        verified: data?.status === "approved",
        pending: data?.status === "pending",
        rejected: data?.status === "rejected",
        required,
        status: data?.status || null,
      };
    },
    enabled: !!userId && !!settings,
  });
}
