import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SupportChatBox } from "@/components/support/SupportChatBox";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  pending: "bg-info/10 text-info",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  pending: "قيد المعالجة",
  closed: "مغلق",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

const priorityLabels: Record<string, string> = {
  low: "منخفض",
  normal: "عادي",
  high: "عالي",
  urgent: "عاجل",
};

export default function AdminTechnicalSupport() {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["admin-support-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-support"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const openCount = conversations?.filter(c => c.status === "open").length || 0;
  const pendingCount = conversations?.filter(c => c.status === "pending").length || 0;
  const closedCount = conversations?.filter(c => c.status === "closed").length || 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="محادثات الدعم الفني"
      subtitle="إدارة والرد على محادثات العملاء"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3">
              <div className="flex flex-col items-center gap-1">
                <Clock className="w-5 h-5 text-warning" />
                <p className="text-xl font-bold">{openCount}</p>
                <p className="text-xs text-muted-foreground">مفتوح</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col items-center gap-1">
                <AlertCircle className="w-5 h-5 text-info" />
                <p className="text-xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">معلق</p>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="w-5 h-5 text-success" />
                <p className="text-xl font-bold">{closedCount}</p>
                <p className="text-xs text-muted-foreground">مغلق</p>
              </div>
            </Card>
          </div>

          {/* Conversations List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              المحادثات
            </h3>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
              ) : conversations?.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد محادثات</p>
                </div>
              ) : (
                conversations?.map((conv) => {
                  const profile = getProfile(conv.user_id);
                  const isSelected = selectedConversation?.id === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/50 hover:bg-muted border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback>
                            {getInitials(profile?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">
                              {profile?.full_name || "مستخدم"}
                            </p>
                            <Badge
                              className={`${statusColors[conv.status]} text-xs`}
                            >
                              {statusLabels[conv.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1">
                            {conv.subject || "بدون عنوان"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(conv.last_message_at), "dd MMM HH:mm", {
                              locale: ar,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel - Chat & User Info */}
        <div className="lg:col-span-2 space-y-4">
          {selectedConversation ? (
            <>
              {/* User Info Card */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">معلومات المستخدم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الاسم</p>
                      <p className="font-medium">
                        {getProfile(selectedConversation.user_id)?.full_name ||
                          "غير متوفر"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">البريد</p>
                      <p className="font-medium text-sm">
                        {getProfile(selectedConversation.user_id)?.email ||
                          "غير متوفر"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الهاتف</p>
                      <p className="font-medium">
                        {getProfile(selectedConversation.user_id)?.phone ||
                          "غير متوفر"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">نوع المستخدم</p>
                      <Badge>
                        {selectedConversation.user_type === "client"
                          ? "عميل"
                          : "فريلانسر"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chat Box */}
              <SupportChatBox conversationId={selectedConversation.id} />
            </>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">اختر محادثة للبدء</p>
                <p className="text-sm">حدد محادثة من القائمة للرد على العميل</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
