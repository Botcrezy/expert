import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  logoUrl: string;
  taxRate: number;
  minWithdrawal: number;
  autoAssignment: boolean;
  emailNotifications: boolean;
  maintenanceMode: boolean;
  bankTransferDetails: string;
  mobileWalletDetails: string;
}

const defaultSettings: PlatformSettings = {
  siteName: "Sity Experts",
  siteDescription: "منصة خدمات مُدارة باحترافية",
  supportEmail: "support@sityexperts.com",
  logoUrl: "",
  taxRate: 14,
  minWithdrawal: 100,
  autoAssignment: true,
  emailNotifications: true,
  maintenanceMode: false,
  bankTransferDetails: "البنك الأهلي المصري\nرقم الحساب: 1234567890\nاسم الحساب: Sity Experts",
  mobileWalletDetails: "فودافون كاش: 01xxxxxxxxx\nأورانج كاش: 01xxxxxxxxx",
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .eq("is_public", true);

      const settings = { ...defaultSettings };

      data?.forEach((setting) => {
        const key = setting.key as keyof PlatformSettings;
        if (key in settings) {
          try {
            // Handle double-encoded JSON strings
            let value = setting.value;
            if (typeof value === "string") {
              // Try to parse, and keep parsing if it's still a string that looks like JSON
              let parsed = value;
              let maxIterations = 5; // Prevent infinite loops
              while (typeof parsed === "string" && maxIterations > 0) {
                try {
                  const nextParsed = JSON.parse(parsed);
                  if (nextParsed === parsed) break; // Same value, stop
                  parsed = nextParsed;
                  maxIterations--;
                } catch {
                  break; // Not valid JSON, use current value
                }
              }
              value = parsed;
            }
            (settings as any)[key] = value;
          } catch {
            (settings as any)[key] = setting.value;
          }
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 1, // Cache for 1 minute for faster updates
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<PlatformSettings>) => {
      const entries = Object.entries(settings);

      for (const [key, value] of entries) {
        await supabase
          .from("settings")
          .upsert(
            {
              key,
              value: JSON.stringify(value),
              group_name: "general",
              type: typeof value === "boolean" ? "boolean" : "string",
              is_public: true,
            },
            { onConflict: "key" }
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح! ✅" });
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}