import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Headphones,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  in_progress: "bg-info/10 text-info",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
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

export default function AdminSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
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

  const { data: replies } = useQuery({
    queryKey: ["ticket-replies", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast({ title: "تم تحديث الحالة ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message,
        is_admin: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies"] });
      toast({ title: "تم إرسال الرد ✅" });
      setReplyMessage("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const openCount = tickets?.filter(t => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter(t => t.status === "in_progress").length || 0;

  const handleReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    replyMutation.mutate({
      ticketId: selectedTicket.id,
      message: replyMessage,
    });
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="تذاكر الدعم الفني"
      subtitle="متابعة والرد على تذاكر الدعم"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">مفتوحة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">قيد المعالجة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tickets?.filter(t => t.status === "resolved").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">تم الحل</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-sm text-muted-foreground">الإجمالي</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم التذكرة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الموضوع</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : tickets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Headphones className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد تذاكر دعم</p>
                  </TableCell>
                </TableRow>
              ) : (
                tickets?.map((ticket) => {
                  const profile = getProfile(ticket.user_id);
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono">{ticket.ticket_number}</TableCell>
                      <TableCell>{profile?.full_name || "غير معروف"}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[ticket.priority || "normal"]}>
                          {priorityLabels[ticket.priority || "normal"]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ticket.status]}>
                          {statusLabels[ticket.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setNewStatus(ticket.status);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 ml-2" />
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Ticket Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تذكرة {selectedTicket?.ticket_number}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">العميل</p>
                  <p className="font-medium">{getProfile(selectedTicket.user_id)?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تغيير الحالة</p>
                  <Select
                    value={newStatus}
                    onValueChange={(value) => {
                      setNewStatus(value);
                      updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: value });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">مفتوح</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="resolved">تم الحل</SelectItem>
                      <SelectItem value="closed">مغلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject & Message */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2">{selectedTicket.subject}</p>
                <p className="text-muted-foreground">{selectedTicket.message}</p>
              </div>

              {/* Replies */}
              <div>
                <p className="text-sm font-medium mb-3">الردود</p>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {replies?.map((reply: any) => {
                    const replyProfile = getProfile(reply.user_id);
                    return (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg ${
                          reply.is_admin ? "bg-primary/10 mr-8" : "bg-muted/50 ml-8"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">
                            {reply.is_admin ? "الدعم الفني" : replyProfile?.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reply.created_at), "dd MMM HH:mm", { locale: ar })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                      </div>
                    );
                  })}
                  {(!replies || replies.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">لا توجد ردود بعد</p>
                  )}
                </div>
              </div>

              {/* Reply Form */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب ردك هنا..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleReply}
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
