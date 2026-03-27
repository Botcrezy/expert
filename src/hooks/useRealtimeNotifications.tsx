import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to notifications changes
    const notificationsChannel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast for new notification
          const notification = payload.new as any;
          const hideClose = notification.reference_type === "request" && notification.title === "تم اكتمال طلبك";

          toast({
            title: notification.title,
            description: notification.body || undefined,
            hideClose,
          });
          
          // Invalidate notifications query
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    // Subscribe to request status changes
    const requestsChannel = supabase
      .channel(`requests-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldStatus = (payload.old as any)?.status;
          const newStatus = (payload.new as any)?.status;
          
          if (oldStatus !== newStatus) {
            // Invalidate requests queries
            queryClient.invalidateQueries({ queryKey: ["client-requests"] });
            queryClient.invalidateQueries({ queryKey: ["request-details"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [user?.id, queryClient, toast]);
}

export function useFreelancerRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Subscribe to assignments changes
    const assignmentsChannel = supabase
      .channel(`assignments-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
          filter: `freelancer_id=eq.${user.id}`,
        },
        (payload) => {
          toast({
            title: "مهمة جديدة! 🎉",
            description: "تم تعيين مهمة جديدة لك",
          });
          
          queryClient.invalidateQueries({ queryKey: ["freelancer-assignments"] });
          queryClient.invalidateQueries({ queryKey: ["freelancer-tasks"] });
        }
      )
      .subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`freelancer-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          toast({
            title: notification.title,
            description: notification.body || undefined,
          });
          
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id, queryClient, toast]);
}
