import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SubscriptionConfig = {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  queryKeys: string[][];
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  showToast?: boolean;
  toastTitle?: string;
};

export function useRealtimeSubscription(configs: SubscriptionConfig[]) {
  const queryClient = useQueryClient();

  // Make dependency stable even if caller passes a new array instance each render.
  // Note: we intentionally exclude handler functions from the key to avoid re-subscribing
  // due to unstable closures.
  const stableKey = JSON.stringify(
    configs.map((c) => ({
      table: c.table,
      event: c.event || "*",
      filter: c.filter || "",
      queryKeys: c.queryKeys,
      showToast: !!c.showToast,
      toastTitle: c.toastTitle || "",
    }))
  );

  useEffect(() => {
    const channels = configs.map((config, index) => {
      const channelConfig: any = {
        event: config.event || "*",
        schema: "public",
        table: config.table,
      };

      if (config.filter) {
        channelConfig.filter = config.filter;
      }

      const channel = supabase
        .channel(`realtime-${config.table}-${index}`)
        .on("postgres_changes" as any, channelConfig, (payload: any) => {
          // Invalidate queries
          config.queryKeys.forEach((keys) => {
            queryClient.invalidateQueries({ queryKey: keys });
          });

          // Call event handlers
          if (payload.eventType === "INSERT" && config.onInsert) {
            config.onInsert(payload);
          }
          if (payload.eventType === "UPDATE" && config.onUpdate) {
            config.onUpdate(payload);
          }
          if (payload.eventType === "DELETE" && config.onDelete) {
            config.onDelete(payload);
          }

          // Show toast if configured
          if (config.showToast && payload.eventType === "INSERT") {
            toast({
              title: config.toastTitle || "تحديث جديد",
              description: "تم استلام بيانات جديدة",
            });
          }
        })
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, stableKey]);
}

// Simplified hook for single table subscription
export function useTableSubscription(
  table: string,
  queryKeys: string[][],
  options?: {
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    filter?: string;
    showToast?: boolean;
    toastTitle?: string;
  }
) {
  useRealtimeSubscription([
    {
      table,
      queryKeys,
      ...options,
    },
  ]);
}
