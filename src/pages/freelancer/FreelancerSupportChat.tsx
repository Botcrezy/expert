import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { SupportChatBox } from "@/components/support/SupportChatBox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function FreelancerSupportChat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["support-conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  if (isLoading) {
    return (
      <DashboardLayout
        sidebar={<FreelancerSidebar />}
        title="محادثة الدعم"
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!conversation || conversation.user_id !== user?.id) {
    return (
      <DashboardLayout
        sidebar={<FreelancerSidebar />}
        title="محادثة الدعم"
      >
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-lg mb-4">لم يتم العثور على هذه المحادثة</p>
            <Button onClick={() => navigate("/freelancer/support")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للدعم
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="محادثة الدعم"
      subtitle={conversation.subject || "محادثة مع فريق الدعم"}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <Button 
          variant="outline" 
          onClick={() => navigate("/freelancer/support")}
        >
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة لقائمة المحادثات
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {conversation.subject || "محادثة دعم"}
              </CardTitle>
              <span className={`text-xs px-3 py-1 rounded-full ${
                conversation.status === "open" 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : conversation.status === "closed" 
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" 
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}>
                {conversation.status === "open" ? "مفتوحة" : conversation.status === "closed" ? "مغلقة" : "قيد الانتظار"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {conversationId && <SupportChatBox conversationId={conversationId} />}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
