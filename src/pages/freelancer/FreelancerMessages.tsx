import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatBox } from "@/components/chat/ChatBox";
import { 
  MessageSquare, 
  Loader2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function FreelancerMessages() {
  const { user } = useAuth();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Fetch all assignments with their requests to show conversations
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["freelancer-conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select(`
          *,
          requests(
            id,
            title,
            request_number,
            status,
            profiles!requests_user_id_fkey(full_name)
          )
        `)
        .eq("freelancer_id", user?.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Get unread message counts for each request
  const { data: messageCounts = {} } = useQuery({
    queryKey: ["freelancer-message-counts", user?.id],
    queryFn: async () => {
      if (!assignments) return {};
      
      const counts: Record<string, number> = {};
      for (const assignment of assignments) {
        const request = assignment.requests as any;
        if (request?.id) {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("request_id", request.id);
          counts[request.id] = count || 0;
        }
      }
      return counts;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="المحادثات">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="المحادثات"
      subtitle="تواصل مع فريق الدعم والإدارة"
    >
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
        {/* Conversations List */}
        <div className="card-elevated flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              المحادثات
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {assignments && assignments.length > 0 ? (
              assignments.map((assignment) => {
                const request = assignment.requests as any;
                const client = request?.profiles as { full_name: string } | null;
                const messageCount = messageCounts[request?.id] || 0;
                
                return (
                  <button
                    key={assignment.id}
                    onClick={() => setSelectedRequestId(request?.id)}
                    className={cn(
                      "w-full p-4 text-right hover:bg-muted/50 transition-colors",
                      selectedRequestId === request?.id && "bg-primary/5 border-r-2 border-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {request?.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {client?.full_name || "عميل"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {request?.request_number}
                        </span>
                        {messageCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                            {messageCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(assignment.assigned_at), "dd MMM", { locale: ar })}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد محادثات</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Box */}
        <div className="lg:col-span-2">
          {selectedRequestId ? (
            <ChatBox 
              requestId={selectedRequestId} 
              className="h-full"
              title="المحادثة"
            />
          ) : (
            <div className="card-elevated h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">اختر محادثة للبدء</p>
                <p className="text-sm">اختر مهمة من القائمة لعرض المحادثة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
