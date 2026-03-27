import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      // Get all completed assignments with their time data
      const { data: completedAssignments } = await supabase
        .from("assignments")
        .select("assigned_at, completed_at, started_at")
        .eq("is_active", false)
        .not("completed_at", "is", null);

      // Calculate average delivery time in hours
      let totalDeliveryHours = 0;
      let deliveryCount = 0;

      completedAssignments?.forEach((assignment) => {
        if (assignment.assigned_at && assignment.completed_at) {
          const startTime = new Date(assignment.started_at || assignment.assigned_at).getTime();
          const endTime = new Date(assignment.completed_at).getTime();
          const hours = (endTime - startTime) / (1000 * 60 * 60);
          
          if (hours > 0 && hours < 720) { // Exclude outliers (more than 30 days)
            totalDeliveryHours += hours;
            deliveryCount++;
          }
        }
      });

      const averageDeliveryHours = deliveryCount > 0 
        ? Math.round(totalDeliveryHours / deliveryCount) 
        : 24;

      // Get total requests and completed requests for completion rate
      const { count: totalRequests } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .neq("status", "cancelled");

      const { count: completedRequests } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      const completionRate = totalRequests && totalRequests > 0
        ? Math.round((completedRequests || 0) / totalRequests * 100)
        : 0;

      // Get other stats
      const { count: totalClients } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "client");

      const { count: totalFreelancers } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "freelancer");

      const { count: verifiedFreelancers } = await supabase
        .from("freelancer_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_verified", true);

      const { count: newRequestsToday } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      const { count: pendingAssignments } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      const { count: openDisputes } = await supabase
        .from("disputes")
        .select("*", { count: "exact", head: true })
        .eq("status", "opened");

      const { count: activeAssignments } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total revenue
      const { data: paidOrders } = await supabase
        .from("orders")
        .select("total")
        .eq("status", "paid");

      const totalRevenue = paidOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

      return {
        averageDeliveryHours,
        completionRate,
        totalClients: totalClients || 0,
        totalFreelancers: totalFreelancers || 0,
        verifiedFreelancers: verifiedFreelancers || 0,
        newRequestsToday: newRequestsToday || 0,
        pendingAssignments: pendingAssignments || 0,
        openDisputes: openDisputes || 0,
        activeAssignments: activeAssignments || 0,
        totalRevenue,
        completedRequests: completedRequests || 0,
        totalRequests: totalRequests || 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
